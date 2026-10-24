async function loadMovies() {
  const response = await fetch('/api/movies');
  const movies = await response.json();

  const select = document.getElementById('showtime-movie');
  select.innerHTML = movies.map(movie => `<option value="${movie.id}">${movie.title}</option>`).join('');
}

async function loadBookings() {
  const response = await fetch('/api/bookings');
  const bookings = await response.json();

  const list = document.getElementById('booking-list');
  if (!bookings.length) {
    list.innerHTML = '<li>Chưa có đặt vé nào.</li>';
    return;
  }

  list.innerHTML = bookings.map((booking) => `
    <li>
      <strong>${booking.customer_name}</strong> - ${booking.movie_title} - ${booking.cinema_name} - ${booking.show_time} - ${booking.seats} ghế
    </li>
  `).join('');
}

document.getElementById('movie-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    title: document.getElementById('movie-title').value,
    genre: document.getElementById('movie-genre').value,
    duration: document.getElementById('movie-duration').value,
    rating: Number(document.getElementById('movie-rating').value || 0)
  };

  await fetch('/api/admin/movies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  event.target.reset();
  await loadMovies();
});

document.getElementById('showtime-form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    movieId: document.getElementById('showtime-movie').value,
    cinemaName: document.getElementById('cinema-name').value,
    startTime: document.getElementById('showtime-time').value,
    price: Number(document.getElementById('showtime-price').value || 0)
  };

  await fetch('/api/admin/showtimes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  event.target.reset();
  await loadBookings();
});

loadMovies();
loadBookings();
