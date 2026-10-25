const express = require('express');
const mysql = require('mysql2');
const path = require('path');
const crypto = require('crypto');
const client = require('prom-client');
const app = express();
const port = 3000;

const sessions = new Map();
const metricsRegistry = new client.Registry();

client.collectDefaultMetrics({ register: metricsRegistry });

const httpRequestsTotal = new client.Counter({
  name: 'movie_ticket_http_requests_total',
  help: 'Total HTTP requests handled by the movie ticket app.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry]
});

const httpRequestDuration = new client.Histogram({
  name: 'movie_ticket_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [metricsRegistry]
});

const movieCount = new client.Gauge({
  name: 'movie_ticket_movies_total',
  help: 'Number of movies stored in the database.',
  registers: [metricsRegistry]
});

const showtimeCount = new client.Gauge({
  name: 'movie_ticket_showtimes_total',
  help: 'Number of showtimes stored in the database.',
  registers: [metricsRegistry]
});

const bookingCount = new client.Gauge({
  name: 'movie_ticket_bookings_total',
  help: 'Number of bookings stored in the database.',
  registers: [metricsRegistry]
});

const userCount = new client.Gauge({
  name: 'movie_ticket_users_total',
  help: 'Number of users stored in the database.',
  registers: [metricsRegistry]
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const startTime = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    httpRequestDuration.observe(
      { method: req.method, route },
      Number(process.hrtime.bigint() - startTime) / 1e9
    );
  });
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (error) {
    next(error);
  }
});

function refreshDatabaseMetrics(db) {
  db.query(
    `SELECT
       (SELECT COUNT(*) FROM movies) AS movies,
       (SELECT COUNT(*) FROM showtimes) AS showtimes,
       (SELECT COUNT(*) FROM bookings) AS bookings,
       (SELECT COUNT(*) FROM users) AS users`,
    (err, rows) => {
      if (err) return;
      movieCount.set(Number(rows[0].movies));
      showtimeCount.set(Number(rows[0].showtimes));
      bookingCount.set(Number(rows[0].bookings));
      userCount.set(Number(rows[0].users));
    }
  );
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getSessionUser(req) {
  const cookie = req.headers.cookie || '';
  const token = cookie
    .split(';')
    .map(item => item.trim())
    .find(item => item.startsWith('token='));

  if (!token) return null;
  const value = token.split('=')[1];
  return sessions.get(value) || null;
}

function setSessionCookie(res, user) {
  const token = crypto.randomUUID();
  sessions.set(token, user);
  res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Lax`);
  return token;
}

function connectDatabase() {
  const db = mysql.createConnection({
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'movie_app',
    password: process.env.DB_PASS || 'MovieApp_Local_Demo_Only_ChangeMe_2026!',
    database: process.env.DB_NAME || 'movie_db',
    charset: 'UTF8MB4_UNICODE_CI'
  });

  db.connect(err => {
    if (err) {
      console.error('Lỗi kết nối Database, thử lại sau 5s:', err.message);
      setTimeout(connectDatabase, 5000);
      return;
    }

    console.log('Đã kết nối thành công tới MySQL Database!');
    app.locals.db = db;
    seedInitialMovies(db);
    refreshDatabaseMetrics(db);
    setInterval(() => refreshDatabaseMetrics(db), 30000).unref();
  });
}

function seedInitialMovies(db) {
  db.query('SELECT COUNT(*) AS total FROM movies', (err, results) => {
    if (!err && Number(results[0].total) === 0) {
      const seedMovies = [
        ['Dune: Hành Tinh Cát - Phần Hai', 'Hành động phiêu lưu', '2h 46m', 8.8, 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'],
        ['Batman: Vạch Trần Sự Thật', 'Hành động giật gân', '2h 56m', 8.6, 'https://image.tmdb.org/t/p/w500/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg'],
        ['Những Mảnh Ghép Cảm Xúc 2', 'Hoạt hình', '1h 36m', 8.0, 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg'],
        ['Oppenheimer: Cha Đẻ Bom Nguyên Tử', 'Tiểu sử, chiến tranh', '3h 0m', 8.6, 'https://image.tmdb.org/t/p/w500/ptpr0kGAckfQkJeJIt8st5dglvd.jpg'],
        ['Người Nhện: Du Hành Vũ Trụ Nhện', 'Hoạt hình, hành động', '2h 20m', 8.6, 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg'],
        ['Hố Đen Tử Thần', 'Khoa học viễn tưởng', '2h 49m', 8.7, 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'],
        ['Avatar: Dòng Chảy Của Nước', 'Khoa học viễn tưởng', '3h 12m', 7.5, 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg'],
        ['Barbie: Thế Giới Rực Rỡ', 'Hài, giả tưởng', '1h 54m', 6.8, 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg']
      ];

      seedMovies.forEach((movie) => {
        db.query(
          'INSERT INTO movies (title, genre, duration, rating, poster_url) VALUES (?, ?, ?, ?, ?)',
          movie,
          (insertErr) => {
            if (insertErr) console.error('Lỗi seed phim:', insertErr);
          }
        );
      });

      db.query(
        `INSERT INTO showtimes (movie_id, cinema_name, start_time, price)
         VALUES 
         (1, 'CGV Hoàng Văn Thụ', '10:00', 120000),
         (1, 'CGV Hoàng Văn Thụ', '18:00', 150000),
         (2, 'Lotte Cinema', '13:30', 135000),
         (3, 'Galaxy', '21:00', 110000),
         (4, 'CGV Mipec Long Biên', '20:30', 160000),
         (5, 'CGV Landmark 81', '16:00', 145000),
         (5, 'Lotte Gò Vấp', '20:15', 160000),
         (6, 'Galaxy Nguyễn Du', '18:30', 140000),
         (7, 'CGV Vincom', '14:00', 130000),
         (8, 'Lotte Cộng Hòa', '19:00', 120000)`,
        (insertErr) => {
          if (insertErr) console.error('Lỗi seed suất chiếu:', insertErr);
        }
      );
    }
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'movie-ticket-system' });
});

app.get('/api/movies', (req, res) => {
  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Database chưa sẵn sàng.' });

  db.query('SELECT * FROM movies ORDER BY id ASC', (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn phim.' });
    res.json(results);
  });
});

app.get('/api/showtimes', (req, res) => {
  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Database chưa sẵn sàng.' });

  const sql = `
    SELECT s.id, s.movie_id, s.cinema_name, s.start_time, s.price, m.title, m.genre, m.duration
    FROM showtimes s
    JOIN movies m ON s.movie_id = m.id
    ORDER BY s.id ASC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn suất chiếu.' });
    res.json(results);
  });
});

app.get('/api/bookings', (req, res) => {
  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Database chưa sẵn sàng.' });

  db.query(
    `SELECT b.*, m.title AS movie_title
     FROM bookings b
     JOIN movies m ON b.movie_id = m.id
     ORDER BY b.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ message: 'Lỗi truy vấn đặt vé.' });
      res.json(results);
    }
  );
});

app.get('/api/seats', (req, res) => {
  const showtimeId = Number(req.query.showtimeId || req.query.id || 1);
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const columns = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const seats = rows.flatMap((row) =>
    columns.map((col) => ({
      code: `${row}${col}`,
      status: (showtimeId + row.charCodeAt(0) + Number(col)) % 7 === 0 ? 'booked' : 'available'
    }))
  );

  res.json(seats);
});

app.get('/api/me', (req, res) => {
  const user = getSessionUser(req);
  if (!user) return res.status(401).json({ message: 'Chưa đăng nhập' });
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin đăng ký.' });
  }

  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Database chưa sẵn sàng.' });

  db.query('SELECT id FROM users WHERE email = ?', [email], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Lỗi truy vấn người dùng.' });
    if (rows.length) return res.status(409).json({ message: 'Email đã tồn tại.' });

    db.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name, email, hashPassword(password), 'user'],
      (insertErr, result) => {
        if (insertErr) return res.status(500).json({ message: 'Lỗi đăng ký user.' });

        const user = { id: result.insertId, name, email, role: 'user' };
        setSessionCookie(res, user);
        res.status(201).json({ message: 'Đăng ký thành công', user });
      }
    );
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Thiếu thông tin đăng nhập.' });
  }

  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Database chưa sẵn sàng.' });

  db.query('SELECT * FROM users WHERE email = ?', [email], (err, rows) => {
    if (err) return res.status(500).json({ message: 'Lỗi đăng nhập.' });
    if (!rows.length) return res.status(401).json({ message: 'Email không tồn tại.' });

    const user = rows[0];
    if (user.password_hash !== hashPassword(password)) {
      return res.status(401).json({ message: 'Mật khẩu không đúng.' });
    }

    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    setSessionCookie(res, safeUser);
    res.json({ message: 'Đăng nhập thành công', user: safeUser });
  });
});

app.post('/api/logout', (req, res) => {
  const cookie = req.headers.cookie || '';
  const token = cookie.split(';').map(item => item.trim()).find(item => item.startsWith('token='));
  if (token) {
    sessions.delete(token.split('=')[1]);
  }

  res.setHeader('Set-Cookie', 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  res.json({ message: 'Đăng xuất thành công' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/home', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/movies', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'movies.html'));
});

app.get('/booking', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'booking.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.post('/api/book', (req, res) => {
  const { movieId, customerName, cinemaName, showTime, seats, seatCodes } = req.body || {};

  if (!movieId || !customerName || !cinemaName || !showTime || !seats) {
    return res.status(400).json({ message: 'Thiếu thông tin đặt vé.' });
  }

  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Cơ sở dữ liệu chưa sẵn sàng.' });

  const selectedSeats = Array.isArray(seatCodes) && seatCodes.length ? seatCodes : [];
  const seatCount = Number(seats);

  if (selectedSeats.length && selectedSeats.length !== seatCount) {
    return res.status(400).json({ message: 'Số ghế chọn không khớp với số lượng đặt vé.' });
  }

  const priceQuery = 'SELECT price FROM showtimes WHERE cinema_name = ? AND start_time = ? LIMIT 1';
  db.query(priceQuery, [cinemaName, showTime], (priceErr, priceRows) => {
    if (priceErr || !priceRows.length) {
      return res.status(400).json({ message: 'Suất chiếu không hợp lệ.' });
    }

    const totalPrice = Number(priceRows[0].price) * seatCount;

    const query = `INSERT INTO bookings (movie_id, customer_name, cinema_name, show_time, seats, total_price)
      VALUES (?, ?, ?, ?, ?, ?)`;

    db.query(query, [Number(movieId), customerName, cinemaName, showTime, seatCount, totalPrice], (err, result) => {
      if (err) {
        console.error('Lỗi insert booking:', err);
        return res.status(500).json({ message: 'Lỗi khi lưu đặt vé.' });
      }

      return res.status(201).json({
        message: 'Đặt vé thành công',
        id: result.insertId,
        totalPrice,
        seats: selectedSeats
      });
    });
  });
});

app.post('/api/admin/movies', (req, res) => {
  const { title, genre, duration, rating } = req.body || {};
  if (!title || !genre || !duration) {
    return res.status(400).json({ message: 'Thiếu thông tin phim.' });
  }

  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Database chưa sẵn sàng.' });

  db.query(
    'INSERT INTO movies (title, genre, duration, rating) VALUES (?, ?, ?, ?)',
    [title, genre, duration, Number(rating || 0)],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Lỗi tạo phim mới.' });
      res.status(201).json({ id: result.insertId, title });
    }
  );
});

app.post('/api/admin/showtimes', (req, res) => {
  const { movieId, cinemaName, startTime, price } = req.body || {};
  if (!movieId || !cinemaName || !startTime || !price) {
    return res.status(400).json({ message: 'Thiếu thông tin suất chiếu.' });
  }

  const db = app.locals.db;
  if (!db) return res.status(503).json({ message: 'Database chưa sẵn sàng.' });

  db.query(
    'INSERT INTO showtimes (movie_id, cinema_name, start_time, price) VALUES (?, ?, ?, ?)',
    [Number(movieId), cinemaName, startTime, Number(price)],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'Lỗi tạo suất chiếu.' });
      res.status(201).json({ id: result.insertId, cinemaName, startTime });
    }
  );
});

app.listen(port, () => {
  console.log(`Ứng dụng đang lắng nghe tại cổng ${port}`);
});

connectDatabase();