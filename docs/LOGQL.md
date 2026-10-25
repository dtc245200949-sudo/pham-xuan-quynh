# Truy vấn LogQL mẫu

Mở Grafana > Explore, chọn datasource Loki và chạy các truy vấn dưới đây.

## 1. Log của ứng dụng

```logql
{container_name="/movie_webapp"}
```

## 2. Log khởi động/kết nối MySQL của ứng dụng

```logql
{container_name="/movie_webapp"} |= "MySQL"
```

## 3. Số dòng log trong 5 phút theo container

```logql
sum by (container_name) (count_over_time({container_name=~"/movie_(webapp|nginx)"}[5m]))
```

Promtail lấy log container qua Docker discovery và gửi đến Loki. Muốn truy vấn theo container khác, xem label `container_name` trong Grafana Explore.