import os
from dotenv import load_dotenv
from azure.core.credentials import AzureKeyCredential
from azure.ai.formrecognizer import DocumentAnalysisClient
from dotenv import load_dotenv
import os
from azure.ai.textanalytics import TextAnalyticsClient

def connect_services() -> DocumentAnalysisClient:
    endpoint = os.getenv("DOC_INTELLIGENCE_ENDPOINT")
    key = os.getenv("DOC_INTELLIGENCE_KEY")
    model_id = os.getenv("MODEL_ID")

    document_analysis_client = DocumentAnalysisClient(
        endpoint=endpoint, credential=AzureKeyCredential(key)
    )

    return document_analysis_client


def connect_language_services() -> TextAnalyticsClient:
     # Load environment variables
    load_dotenv()
    # Azure Form Recognizer endpoint and key
    endpoint = os.getenv("LANGUAGE_RESOURCE_ENDPOINT")
    key = os.getenv("LANGUAGE_RESOURCE_KEY")

    text_analytics_client = TextAnalyticsClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(key),
    )

    return text_analytics_client