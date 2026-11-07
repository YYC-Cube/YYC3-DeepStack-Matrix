#!/usr/bin/env python3
# AM webhook 演练接收器(2026-11-07 二次演练;POST 记录到 /tmp/am-webhook.log)
# 用法:scp 到 NAS 后 nohup python3 /tmp/am-mock-receiver.py &
import json
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(n).decode('utf-8', 'ignore')
        alerts = []
        try:
            d = json.loads(body)
            for a in d.get('alerts', []):
                alerts.append(a['labels'].get('alertname', '?') + '/' + a['status'].get('state', '?'))
        except Exception:
            pass
        line = '%s %s %s\n' % (datetime.now().strftime('%H:%M:%S'), self.path, ','.join(alerts) or body[:80])
        open('/tmp/am-webhook.log', 'a').write(line)
        # 全量 body 留痕(演练铁证;告警明细含 alertname/severity)
        open('/tmp/am-webhook-body.log', 'a').write(line + body[:4000] + '\n')
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def log_message(self, *a):
        pass


HTTPServer(('0.0.0.0', 5001), H).serve_forever()
