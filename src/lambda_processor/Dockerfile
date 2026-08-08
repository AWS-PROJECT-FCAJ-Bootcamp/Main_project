FROM public.ecr.aws/lambda/python:3.12

# Install dependencies vào /var/task (LAMBDA_TASK_ROOT)
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt -t ${LAMBDA_TASK_ROOT}

# Copy Lambda handler vào LAMBDA_TASK_ROOT
COPY main.py ${LAMBDA_TASK_ROOT}/main.py

# CMD phải khớp với tên file.tên_function
CMD ["main.handler"]
