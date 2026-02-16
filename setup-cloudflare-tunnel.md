# Cài đặt Cloudflare Tunnel cho Backend (Docker)

## Bước 1: Deploy backend với Cloudflared

Backend đã được cấu hình sẵn cloudflared trong `docker-compose.yml`. Chỉ cần deploy:

```bash
# Trên server backend (SSH vào 34.41.9.244)
cd /path/to/backend
docker-compose up -d
```

## Bước 2: Lấy URL tunnel

Xem logs của cloudflared để lấy URL HTTPS:

```bash
docker-compose logs cloudflared
```

Bạn sẽ thấy dòng như: `https://xyz-abc-123.trycloudflare.com`

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

## Quản lý tunnel

```bash
# Xem trạng thái
docker-compose ps

# Restart tunnel (sẽ tạo URL mới)
docker-compose restart cloudflared

# Xem logs realtime
docker-compose logs -f cloudflared

# Stop toàn bộ
docker-compose down
```

Tunnel sẽ tự động khởi động lại khi server reboot (restart: unless-stopped)

---

**Ưu điểm:**
- Miễn phí 100%
- Không cần domain
- Tự động có SSL
- Setup trong 2 phút

**Nhược điểm:**
- URL sẽ thay đổi mỗi lần restart (trừ khi dùng named tunnel)
