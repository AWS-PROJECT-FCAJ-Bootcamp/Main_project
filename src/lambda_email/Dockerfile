FROM public.ecr.aws/lambda/python:3.12

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt -t ${LAMBDA_TASK_ROOT}

COPY main.py ${LAMBDA_TASK_ROOT}/main.py

CMD ["main.handler"]
