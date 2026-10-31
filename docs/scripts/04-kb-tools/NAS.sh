# NAS本地入库 (零网络传输)
scp -P 9557 scripts/kb-ingest-xxx.py yyc3-45:/tmp/
ssh -p 9557 yyc3-45 "python3 /tmp/kb-ingest-xxx.py"

# iMac入库 (网络写入NAS DB)
scp scripts/kb-ingest-imac77.py my@192.168.3.77:/tmp/
ssh my@192.168.3.77 "python3 /tmp/kb-ingest-imac77.py"
