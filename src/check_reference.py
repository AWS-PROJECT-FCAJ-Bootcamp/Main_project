from vnstock import Reference
import inspect

ref = Reference()

print(inspect.signature(ref.equity.list_by_exchange))
print(inspect.signature(ref.equity.list))
print(inspect.signature(ref.equity.list_by_industry))