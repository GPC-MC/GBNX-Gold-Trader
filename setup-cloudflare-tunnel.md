# Cài đặt Cloudflare Tunnel cho Backend

## Bước 1: Cài đặt cloudflared trên server backend (34.41.9.244)

```bash
# Trên server backend (SSH vào 34.41.9.244)
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

## Bước 2: Tạo tunnel (chạy trên server backend)

```bash
cloudflared tunnel --url http://localhost:8081
```

Lệnh này sẽ cho bạn 1 URL HTTPS miễn phí dạng: `https://xyz-abc-123.trycloudflare.com`

## Bước 3: Update file .env của frontend

Thay vì:
```
VITE_BACKEND_API_BASE_URL=http://34.41.9.244:8081
```

Dùng:
```
VITE_BACKEND_API_BASE_URL=https://xyz-abc-123.trycloudflare.com
```

## Bước 4: Deploy lại frontend lên Vercel

Code của bạn sẽ tự động chuyển `https://` thành `wss://` cho WebSocket!

## Chạy tunnel vĩnh viễn (optional)

```bash
# Chạy tunnel như một service
cloudflared service install
```

---

**Ưu điểm:**
- Miễn phí 100%
- Không cần domain
- Tự động có SSL
- Setup trong 2 phút

**Nhược điểm:**
- URL sẽ thay đổi mỗi lần restart (trừ khi dùng named tunnel)
