const movieList = document.getElementById('movie-list');
const movieSelect = document.getElementById('movie');
const cinemaSelect = document.getElementById('cinema');
const timeSelect = document.getElementById('time');
const form = document.getElementById('booking-form');
const resultBox = document.getElementById('booking-result');
const seatGrid = document.getElementById('seat-grid');
const userStatus = document.getElementById('user-status');
let selectedSeats = [];
let currentShowtimeId = 1;
let showtimes = [];

async function fetchMe() {
  if (!userStatus) return;

  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' });
    if (!response.ok) {
      userStatus.textContent = 'Bạn chưa đăng nhập. Vui lòng đăng nhập để đặt vé.';
      return;
    }

    const user = await response.json();
    userStatus.innerHTML = `Xin chào <strong>${user.name}</strong> (${user.role})`;
  } catch (error) {
    userStatus.textContent = 'Bạn chưa đăng nhập. Vui lòng đăng nhập để đặt vé.';
  }
}

async function loadMovies() {
  const response = await fetch('/api/movies');
  const movies = await response.json();

  if (movieList) movieList.innerHTML = movies.map(movie => `
    <article class="movie-card">
      <div class="poster">
        <img src="${movie.poster_url}" alt="Poster phim ${movie.title}" loading="lazy" onerror="this.hidden = true" />
      </div>
      <h3>${movie.title}</h3>
      <p>${movie.genre} · ${movie.duration}</p>
      <p>IMDb ${movie.rating}</p>
      <a class="movie-book-link" href="/booking?movieId=${movie.id}">Chọn phim này</a>
    </article>
  `).join('');

  if (movieSelect) {
    movieSelect.innerHTML = movies.map(movie => `<option value="${movie.id}">${movie.title}</option>`).join('');
    const requestedMovieId = new URLSearchParams(window.location.search).get('movieId');
    if (requestedMovieId && movies.some(movie => String(movie.id) === requestedMovieId)) {
      movieSelect.value = requestedMovieId;
    }
  }
}

async function loadShowtimes() {
  const response = await fetch('/api/showtimes');
  showtimes = await response.json();
  updateShowtimeOptions();
}

function updateShowtimeOptions() {
  const selectedMovieId = Number(movieSelect.value);
  const movieShowtimes = showtimes.filter(item => Number(item.movie_id) === selectedMovieId);
  const cinemas = [...new Set(movieShowtimes.map(item => item.cinema_name))];

  if (!cinemas.length) {
    cinemaSelect.innerHTML = '<option value="">Chưa có rạp chiếu</option>';
    timeSelect.innerHTML = '<option value="">Chưa có suất chiếu</option>';
    currentShowtimeId = 0;
    selectedSeats = [];
    seatGrid.innerHTML = '<p>Phim hiện chưa có suất chiếu.</p>';
    return;
  }

  const selectedCinema = cinemas.includes(cinemaSelect.value) ? cinemaSelect.value : cinemas[0];
  cinemaSelect.innerHTML = cinemas.map(cinema => `<option value="${cinema}">${cinema}</option>`).join('');
  cinemaSelect.value = selectedCinema;
  const filtered = movieShowtimes.filter(item => item.cinema_name === selectedCinema);
  const selectedShowtime = filtered.find(item => item.start_time === timeSelect.value) || filtered[0];

  timeSelect.innerHTML = filtered.map(item => `<option value="${item.start_time}">${item.start_time} - ${item.title}</option>`).join('');
  timeSelect.value = selectedShowtime.start_time;
  currentShowtimeId = selectedShowtime.id;
  selectedSeats = [];
  renderSeatGrid();
}

async function renderSeatGrid() {
  const response = await fetch(`/api/seats?showtimeId=${currentShowtimeId}`);
  const seats = await response.json();

  seatGrid.innerHTML = seats.map((seat) => {
    const disabled = seat.status === 'booked';
    const selected = selectedSeats.includes(seat.code);
    return `
      <button
        type="button"
        class="seat-btn ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}"
        data-seat="${seat.code}"
        ${disabled ? 'disabled' : ''}
        style="width: 40px; height: 40px; border-radius: 8px; background: ${disabled ? '#64748b' : selected ? '#22c55e' : '#1e293b'}; color: white; border: 1px solid #475569; cursor: pointer;"
      >${seat.code}</button>
    `;
  }).join('');

  seatGrid.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      const seat = button.dataset.seat;
      const maxSeats = Number(document.getElementById('seats').value || 1);
      if (selectedSeats.includes(seat)) {
        selectedSeats = selectedSeats.filter(item => item !== seat);
      } else if (selectedSeats.length < maxSeats) {
        selectedSeats.push(seat);
      }
      renderSeatGrid();
    });
  });
}

if (form) {
movieSelect.addEventListener('change', updateShowtimeOptions);

cinemaSelect.addEventListener('change', updateShowtimeOptions);

timeSelect.addEventListener('change', () => {
  const selectedShowtime = showtimes.find(item =>
    Number(item.movie_id) === Number(movieSelect.value) &&
    item.cinema_name === cinemaSelect.value &&
    item.start_time === timeSelect.value
  );
  if (!selectedShowtime) return;
  currentShowtimeId = selectedShowtime.id;
  selectedSeats = [];
  renderSeatGrid();
});

document.getElementById('seats').addEventListener('input', () => {
  const maxSeats = Number(document.getElementById('seats').value || 1);
  if (selectedSeats.length > maxSeats) {
    selectedSeats = selectedSeats.slice(0, maxSeats);
  }
  renderSeatGrid();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!selectedSeats.length) {
    resultBox.className = 'booking-result error';
    resultBox.textContent = '❌ Vui lòng chọn ghế trước khi đặt vé.';
    return;
  }

  const payload = {
    movieId: Number(movieSelect.value),
    customerName: document.getElementById('customer-name').value || 'Khách hàng',
    cinemaName: cinemaSelect.value,
    showTime: timeSelect.value,
    seats: Number(document.getElementById('seats').value),
    seatCodes: selectedSeats
  };

  try {
    const response = await fetch('/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Đặt vé thất bại');
    }

    resultBox.className = 'booking-result success';
    resultBox.textContent = `✅ Đặt vé thành công! Ghế: ${selectedSeats.join(', ')}. Tổng tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.totalPrice || 0)}`;
    selectedSeats = [];
    renderSeatGrid();
  } catch (error) {
    resultBox.className = 'booking-result error';
    resultBox.textContent = `❌ ${error.message}`;
  }
});

async function initializeBooking() {
  await loadMovies();
  await loadShowtimes();
  await fetchMe();
}

initializeBooking();
}

if (movieList) loadMovies();
