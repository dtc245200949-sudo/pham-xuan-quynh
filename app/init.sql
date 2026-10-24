CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  duration VARCHAR(50) NOT NULL,
  rating DECIMAL(3,1) DEFAULT 0,
  poster_url VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS showtimes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  movie_id INT NOT NULL,
  cinema_name VARCHAR(200) NOT NULL,
  start_time VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  FOREIGN KEY (movie_id) REFERENCES movies(id)
);

CREATE TABLE IF NOT EXISTS seats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  showtime_id INT NOT NULL,
  seat_code VARCHAR(10) NOT NULL,
  status ENUM('available','booked') DEFAULT 'available',
  FOREIGN KEY (showtime_id) REFERENCES showtimes(id)
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  movie_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  cinema_name VARCHAR(200) NOT NULL,
  show_time VARCHAR(50) NOT NULL,
  seats INT NOT NULL,
  total_price DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending','confirmed','cancelled') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES movies(id)
);

INSERT INTO movies (title, genre, duration, rating, poster_url)
VALUES
  ('Dune: Hành Tinh Cát - Phần Hai', 'Hành động phiêu lưu', '2h 46m', 8.8, 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'),
  ('Batman: Vạch Trần Sự Thật', 'Hành động giật gân', '2h 56m', 8.6, 'https://image.tmdb.org/t/p/w500/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg'),
  ('Những Mảnh Ghép Cảm Xúc 2', 'Hoạt hình', '1h 36m', 8.0, 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg'),
  ('Oppenheimer: Cha Đẻ Bom Nguyên Tử', 'Tiểu sử, chiến tranh', '3h 0m', 8.6, 'https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg')
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO showtimes (movie_id, cinema_name, start_time, price)
VALUES
  (1, 'CGV Hoàng Văn Thụ', '10:00', 120000),
  (1, 'CGV Hoàng Văn Thụ', '18:00', 150000),
  (2, 'Lotte Cinema', '13:30', 135000),
  (3, 'Galaxy', '21:00', 110000),
  (4, 'CGV Mipec Long Biên', '20:30', 160000)
ON DUPLICATE KEY UPDATE cinema_name = VALUES(cinema_name);

CREATE USER IF NOT EXISTS 'movie_monitor'@'%' IDENTIFIED BY 'monitorpassword';
GRANT PROCESS, REPLICATION CLIENT, SELECT ON *.* TO 'movie_monitor'@'%';