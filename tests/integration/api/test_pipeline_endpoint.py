import json
import pytest

import src.api.routers.pipeline as pipeline_router

pytestmark = pytest.mark.integration


def test_pipeline_trigger_local_environment_rejected(api_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "local")
    response = api_client.post("/pipeline/trigger", json=["FPT"])
    assert response.status_code == 400
    assert "chỉ khả dụng trên cloud" in response.json()["detail"]


def test_pipeline_trigger_cloud_invokes_lambda(api_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "cloud")
    monkeypatch.setenv("COLLECTOR_LAMBDA_NAME", "fake-lambda")

    class FakeLambdaClient:
        def invoke(self, FunctionName, InvocationType, Payload):
            assert FunctionName == "fake-lambda"
            assert InvocationType == "Event"
            payload = json.loads(Payload.decode())
            assert payload["tickers"] == ["FPT"]
            return {"StatusCode": 202}

    monkeypatch.setattr(pipeline_router, "_get_lambda_client", lambda: FakeLambdaClient())

    response = api_client.post("/pipeline/trigger", json=["FPT"])
    assert response.status_code == 200
    assert response.json()["message"] == "Pipeline triggered successfully"


def test_pipeline_status_local_environment(api_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "local")
    response = api_client.get("/pipeline/status")
    assert response.status_code == 200
    assert response.json()["environment"] == "local"


def test_pipeline_status_cloud_lists_s3(api_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "cloud")
    monkeypatch.setenv("RAW_DATA_BUCKET", "fake-bucket")
    
    from datetime import datetime

    class FakeS3Client:
        def list_objects_v2(self, Bucket, Prefix, MaxKeys):
            assert Bucket == "fake-bucket"
            return {
                "KeyCount": 1,
                "Contents": [
                    {
                        "Key": "ohlcv/fake.json",
                        "Size": 1024,
                        "LastModified": datetime(2025, 1, 1),
                    }
                ]
            }

    monkeypatch.setattr(pipeline_router, "_get_s3_client", lambda: FakeS3Client())

    response = api_client.get("/pipeline/status")
    assert response.status_code == 200
    assert response.json()["total_files_found"] == 1
    assert response.json()["latest_files"][0]["key"] == "ohlcv/fake.json"


def test_pipeline_run_local_environment(api_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "local")
    
    # Mock ingest_tickers and transform_raw_data
    monkeypatch.setattr(pipeline_router, "ingest_tickers", lambda *args, **kwargs: {"passed": 1})
    monkeypatch.setattr(pipeline_router, "transform_raw_data", lambda *args, **kwargs: {"processed": 1})
    
    payload = {
        "tickers": ["FPT"],
        "start_date": "2026-08-01",
        "end_date": "2026-08-05",
        "interval": "1D"
    }
    response = api_client.post("/pipeline/run", json=payload)
    assert response.status_code == 200
    assert response.json()["ingestion"]["passed"] == 1
    assert response.json()["transformation"]["processed"] == 1


def test_pipeline_run_cloud_environment(api_client, monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "cloud")
    monkeypatch.setenv("COLLECTOR_LAMBDA_NAME", "fake-lambda")
    
    class FakeLambdaClient:
        def invoke(self, FunctionName, InvocationType, Payload):
            assert FunctionName == "fake-lambda"
            assert InvocationType == "Event"
            payload = json.loads(Payload.decode())
            assert payload["tickers"] == ["FPT"]
            assert payload["start_date"] == "2026-08-01"
            assert payload["end_date"] == "2026-08-05"
            return {"StatusCode": 202}
            
    monkeypatch.setattr(pipeline_router, "_get_lambda_client", lambda: FakeLambdaClient())
    
    payload = {
        "tickers": ["FPT"],
        "start_date": "2026-08-01",
        "end_date": "2026-08-05",
        "interval": "1D"
    }
    response = api_client.post("/pipeline/run", json=payload)
    assert response.status_code == 200
    assert "triggered successfully" in response.json()["message"]

