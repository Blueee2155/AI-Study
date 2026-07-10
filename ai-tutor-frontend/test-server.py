"""Test proxy server"""
import http.server
import socketserver
import os

PORT = 8080

class SimpleHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"GET request: {self.path}")
        super().do_GET()

os.chdir(os.path.join(os.path.dirname(__file__), 'dist'))

with socketserver.TCPServer(("0.0.0.0", PORT), SimpleHandler) as httpd:
    print(f"Server started on port {PORT}")
    httpd.serve_forever()
