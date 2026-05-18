"""
RAG (Retrieval-Augmented Generation) System for Financial Dashboard
Uses ChromaDB for vector storage and semantic search
"""
import chromadb
from chromadb.utils import embedding_functions
from database import get_financials
from measures import get_all_pnl_measures, get_unique_students, get_unique_schools
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

EMBEDDING_BACKEND = os.getenv("EMBEDDING_BACKEND", "onnx")


def build_embedding_function():
    if EMBEDDING_BACKEND == "sentence_transformers":
        print("📦 Using sentence-transformers embedder (high quality, ~500MB)")
        return embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
    else:
        print("📦 Using ONNX default embedder (lightweight, ~50MB)")
        return embedding_functions.DefaultEmbeddingFunction()


class FinancialRAG:
    def __init__(self):
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self.embedding_function = build_embedding_function()

        try:
            self.collection = self.client.get_collection(
                name="omotec_financials",
                embedding_function=self.embedding_function
            )
            print("✅ Loaded existing RAG collection")
        except Exception:
            self.collection = self.client.create_collection(
                name="omotec_financials",
                embedding_function=self.embedding_function,
                metadata={"description": "OMOTEC Financial Data"}
            )
            print("✅ Created new RAG collection")

    def index_omotec_financials(self, force_reindex=False):
        if self.collection.count() > 0 and not force_reindex:
            print(f"📚 RAG already indexed with {self.collection.count()} documents")
            return

        print("🔄 Starting RAG indexing process...")

        try:
            df = get_financials()
            if df.empty:
                print("⚠️  No data to index")
                return

            divisor = 100000  # Lakhs
            documents, metadatas, ids = [], [], []

            # 1. Overall summary (all years combined)
            m = get_all_pnl_measures(df, divisor)
            documents.append(
                f"Overall Financial Performance Summary (All Years Combined):\n"
                f"Revenue: ₹{m['Revenue']:.2f} Lakhs\n"
                f"Gross Profit: ₹{m['Gross Profit']:.2f} Lakhs ({m['Gross Profit %']:.1f}% margin)\n"
                f"EBITDA: ₹{m['EBITDA']:.2f} Lakhs ({m['EBITDA %']:.1f}% margin)\n"
                f"PAT: ₹{m['PAT']:.2f} Lakhs ({m['PAT %']:.1f}% margin)\n"
                f"Direct Expense: ₹{m['Direct Expense']:.2f} Lakhs\n"
                f"Indirect Expense: ₹{m['Indirect Expense']:.2f} Lakhs\n"
                f"This is OMOTEC's total financial performance across all years and segments."
            )
            metadatas.append({"type": "overall_summary", "segment": "all", "year": "all", "indexed_at": datetime.now().isoformat()})
            ids.append("overall_summary")

            # 2. Year-level summaries — THIS FIXES the "total revenue of FY25_26" problem
            if 'source_year' in df.columns:
                for year in df['source_year'].unique():
                    if year:
                        df_year = df[df['source_year'] == year]
                        ym = get_all_pnl_measures(df_year, divisor)
                        students = get_unique_students(df_year)
                        schools = get_unique_schools(df_year)

                        doc_id = f"year_{year}"
                        documents.append(
                            f"Annual Financial Performance for {year}:\n"
                            f"Total Revenue: ₹{ym['Revenue']:.2f} Lakhs\n"
                            f"Total Direct Expense: ₹{ym['Direct Expense']:.2f} Lakhs\n"
                            f"Gross Profit: ₹{ym['Gross Profit']:.2f} Lakhs ({ym['Gross Profit %']:.1f}% margin)\n"
                            f"Indirect Expense: ₹{ym['Indirect Expense']:.2f} Lakhs\n"
                            f"EBITDA: ₹{ym['EBITDA']:.2f} Lakhs ({ym['EBITDA %']:.1f}% margin)\n"
                            f"Depreciation: ₹{ym['Depreciation']:.2f} Lakhs\n"
                            f"EBIT: ₹{ym['EBIT']:.2f} Lakhs\n"
                            f"Interest: ₹{ym['Interest']:.2f} Lakhs\n"
                            f"PBT: ₹{ym['PBT']:.2f} Lakhs\n"
                            f"Tax: ₹{ym['Tax']:.2f} Lakhs\n"
                            f"PAT (Net Profit): ₹{ym['PAT']:.2f} Lakhs ({ym['PAT %']:.1f}% margin)\n"
                            f"Students Impacted: {students:,}\n"
                            f"Schools Partnered: {schools:,}\n"
                            f"This represents OMOTEC's complete annual performance for the financial year {year}."
                        )
                        metadatas.append({"type": "year_summary", "year": str(year), "indexed_at": datetime.now().isoformat()})
                        ids.append(doc_id)

            # 3. Segment-wise summaries (all years)
            if 'segment' in df.columns:
                for segment in df['segment'].unique():
                    if segment and str(segment).upper() != 'ALL':
                        df_seg = df[df['segment'] == segment]
                        sm = get_all_pnl_measures(df_seg, divisor)
                        documents.append(
                            f"{str(segment).upper()} Segment Financial Performance (All Years):\n"
                            f"Revenue: ₹{sm['Revenue']:.2f} Lakhs\n"
                            f"Gross Profit: ₹{sm['Gross Profit']:.2f} Lakhs ({sm['Gross Profit %']:.1f}% margin)\n"
                            f"EBITDA: ₹{sm['EBITDA']:.2f} Lakhs ({sm['EBITDA %']:.1f}% margin)\n"
                            f"PAT: ₹{sm['PAT']:.2f} Lakhs ({sm['PAT %']:.1f}% margin)\n"
                            f"Direct Expense: ₹{sm['Direct Expense']:.2f} Lakhs\n"
                            f"Indirect Expense: ₹{sm['Indirect Expense']:.2f} Lakhs"
                        )
                        metadatas.append({"type": "segment_summary", "segment": str(segment), "year": "all", "indexed_at": datetime.now().isoformat()})
                        ids.append(f"segment_{segment}")

            # 4. Year + Segment combinations (e.g. "Centre segment in FY25-26")
            if 'source_year' in df.columns and 'segment' in df.columns:
                for year in df['source_year'].unique():
                    for segment in df['segment'].unique():
                        if year and segment and str(segment).upper() != 'ALL':
                            df_ys = df[(df['source_year'] == year) & (df['segment'] == segment)]
                            if not df_ys.empty:
                                ysm = get_all_pnl_measures(df_ys, divisor)
                                doc_id = f"year_{year}_segment_{segment}"
                                documents.append(
                                    f"{str(segment).upper()} Segment Performance for {year}:\n"
                                    f"Revenue: ₹{ysm['Revenue']:.2f} Lakhs\n"
                                    f"Gross Profit: ₹{ysm['Gross Profit']:.2f} Lakhs ({ysm['Gross Profit %']:.1f}% margin)\n"
                                    f"EBITDA: ₹{ysm['EBITDA']:.2f} Lakhs ({ysm['EBITDA %']:.1f}% margin)\n"
                                    f"PAT: ₹{ysm['PAT']:.2f} Lakhs ({ysm['PAT %']:.1f}% margin)"
                                )
                                metadatas.append({"type": "year_segment_summary", "year": str(year), "segment": str(segment), "indexed_at": datetime.now().isoformat()})
                                ids.append(doc_id)

            # 5. Monthly summaries
            if 'month' in df.columns and 'source_year' in df.columns:
                for year in df['source_year'].unique():
                    for month in df['month'].unique():
                        if year and month:
                            df_m = df[(df['source_year'] == year) & (df['month'] == month)]
                            if not df_m.empty:
                                mm = get_all_pnl_measures(df_m, divisor)
                                documents.append(
                                    f"Financial Performance for {month} {year}:\n"
                                    f"Revenue: ₹{mm['Revenue']:.2f} Lakhs\n"
                                    f"Gross Profit: ₹{mm['Gross Profit']:.2f} Lakhs ({mm['Gross Profit %']:.1f}% margin)\n"
                                    f"EBITDA: ₹{mm['EBITDA']:.2f} Lakhs ({mm['EBITDA %']:.1f}% margin)\n"
                                    f"PAT: ₹{mm['PAT']:.2f} Lakhs ({mm['PAT %']:.1f}% margin)"
                                )
                                metadatas.append({"type": "monthly_summary", "month": str(month), "year": str(year), "indexed_at": datetime.now().isoformat()})
                                ids.append(f"monthly_{year}_{month}")

            # 6. Operational metrics
            students = get_unique_students(df)
            schools = get_unique_schools(df)
            documents.append(
                f"Operational Impact Metrics (All Years):\n"
                f"Unique Students Impacted: {students:,}\n"
                f"Unique Schools Partnered: {schools:,}\n"
                f"These represent OMOTEC's total educational impact."
            )
            metadatas.append({"type": "operational_metrics", "year": "all", "indexed_at": datetime.now().isoformat()})
            ids.append("operational_metrics")

            # Store everything in ChromaDB
            self.collection.add(documents=documents, metadatas=metadatas, ids=ids)

            year_count = sum(1 for m in metadatas if m['type'] == 'year_summary')
            seg_count = sum(1 for m in metadatas if m['type'] == 'segment_summary')
            ys_count = sum(1 for m in metadatas if m['type'] == 'year_segment_summary')
            month_count = sum(1 for m in metadatas if m['type'] == 'monthly_summary')
            print(f"✅ Indexed {len(documents)} documents: 1 overall, {year_count} years, {seg_count} segments, {ys_count} year+segment, {month_count} months, 1 ops")

        except Exception as e:
            print(f"❌ Error indexing data: {e}")

    def retrieve(self, query: str, n_results: int = 5):
        """Semantic search — returns top N most relevant chunks for the query."""
        try:
            count = self.collection.count()
            if count == 0:
                return []
            results = self.collection.query(
                query_texts=[query],
                n_results=min(n_results, count)
            )
            retrieved = []
            if results and results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    distance = results['distances'][0][i] if results['distances'] else 0
                    retrieved.append({
                        'content': doc,
                        'metadata': metadata,
                        'relevance_score': 1 - distance
                    })
            return retrieved
        except Exception as e:
            print(f"❌ Error retrieving documents: {e}")
            return []

    def generate_context(self, retrieved_docs):
        if not retrieved_docs:
            return "No relevant financial data found."
        context = "RELEVANT FINANCIAL DATA:\n\n"
        for i, doc in enumerate(retrieved_docs, 1):
            context += f"[Document {i}] (Relevance: {doc['relevance_score']:.2%})\n"
            context += f"{doc['content']}\n\n"
        context += "\nAll amounts are in Indian Rupees (INR) in Lakhs unless specified."
        return context

    def reindex_if_needed(self):
        if self.collection.count() == 0:
            self.index_omotec_financials(force_reindex=True)


# Global singleton
rag = FinancialRAG()
rag.index_omotec_financials()
