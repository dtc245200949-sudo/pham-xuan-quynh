# Hệ thống Đặt vé Xem phim - Movie Ticket System

## Mô tả đề tài
Hệ thống đặt vé xem phim / sự kiện, xây dựng trên stack Node.js + MySQL + Nginx + Prometheus + Grafana + Loki + Promtail.

## Công nghệ sử dụng
- Backend: Node.js + Express
- Database: MySQL + phpMyAdmin
- Reverse proxy: Nginx
- Monitoring: Prometheus + Grafana
- Logging: Loki + Promtail
- Hardening: non-root container, network isolation, security headers

## Cấu trúc dự án
- app/: ứng dụng web backend
- nginx/: cấu hình reverse proxy
- prometheus/: cấu hình Prometheus
- loki/: cấu hình Loki
- promtail/: cấu hình Promtail
- docker-compose.yml: orchestrate toàn bộ hệ thống

## Hướng dẫn chạy
1. Khởi động hệ thống:
   ```bash
   cp .env.example .env
   # Change all demo passwords in .env before exposing services outside localhost.
   docker compose up -d --build
   ```
2. Truy cập ứng dụng:
   - http://localhost:8280
   - http://localhost:8280/movies (Phim đang chiếu)
   - http://localhost:8280/booking (Đặt vé)
   - http://localhost:8080 (phpMyAdmin)
   - http://localhost:3000 (Grafana)
   - http://localhost:9090 (Prometheus)
   - Dashboard Grafana: http://localhost:3000/d/movie-ticket-overview/movie-ticket-system-tong-quan
3. Admin page:
   - http://localhost:8280/admin

## Tài khoản demo và dữ liệu giám sát
- Grafana: `admin` / giá trị `GRAFANA_ADMIN_PASSWORD` trong `.env`
- phpMyAdmin: chọn máy chủ `mysql`, đăng nhập `root` / giá trị `MYSQL_ROOT_PASSWORD` trong `.env`, cơ sở dữ liệu `movie_db`
- Web app kết nối bằng user `MYSQL_APP_USER`, chỉ có quyền đọc/ghi dữ liệu trong `movie_db`; không dùng `root`.
- Cơ sở dữ liệu mẫu có phim, suất chiếu, người dùng và lượt đặt vé; dữ liệu giữ trong MySQL container.
- Prometheus thu thập metrics của app tại `/metrics`, MySQL qua `mysqld-exporter`, và CPU/RAM từng container qua Docker API exporter; cAdvisor bổ sung metrics cgroup trên Linux.
- Dashboard Grafana hiển thị trạng thái dịch vụ, lưu lượng, độ trễ, số phim/suất chiếu/lượt đặt vé/người dùng, CPU/RAM từng container và log ứng dụng.
- Các truy vấn LogQL mẫu được ghi tại [docs/LOGQL.md](docs/LOGQL.md).
- Lịch sử metrics và dữ liệu Grafana được lưu bằng Docker volumes; log Loki được thu thập khi dịch vụ hoạt động.

## Chức năng chính
- Hiển thị phim đang chiếu
- Đặt vé theo phim, rạp, suất chiếu, số ghế
- Lưu thông tin đặt vé vào MySQL
- Quản lý phim và suất chiếu qua admin page
- Giám sát container qua Prometheus/Grafana
- Thu thập log qua Loki/Promtail

## Hardening đã áp dụng
- Nginx security headers
- User non-root trong app container
- Tách mạng database nội bộ khỏi mạng reverse proxy/monitoring; MySQL không publish cổng host
- User ứng dụng chỉ có quyền SELECT/INSERT/UPDATE/DELETE trên `movie_db`
- Đặt mật khẩu qua `.env`, không commit `.env`
- Chỉ expose các port cần thiết cho demo
- MySQL health check

## Tài liệu báo cáo
Dự án này phù hợp với nội dung đề tài thực hành: triển khai và quản trị hệ thống phần mềm, bao gồm Docker Compose, CI/CD GitHub, monitoring, reverse proxy, logging và hardening.