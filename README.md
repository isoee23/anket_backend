BACKEND (Express + CORS)
------------------------
Kurulum:
1) Node.js 18+ kurulu olmalı.
2) Bu klasörde `npm install` komutunu çalıştırın.
3) `.env.example` dosyasını `.env` olarak kopyalayın ve değerleri düzenleyin.
4) `npm start` ile API'yi başlatın (varsayılan: http://localhost:3000).

Uç Noktalar:
- POST /api/submit
  Gövde: {{ "answers": {{OK1..TE5}} }}
  Örn: `{{"OK1":5,"OK2":4,...}}` (1–5 aralığı zorunlu)
- GET  /api/responses
  Dönüş: Son 1000 kayıt + istatistikler
- GET  /api/export.csv
  Dönüş: Tüm verilerin CSV çıktısı
- DELETE /api/responses  (Yönetici)
  Header: X-ADMIN-TOKEN: <.env'deki ADMIN_TOKEN>

Barındırma Önerileri:
- Railway, Render, Fly.io, Deta Space veya kendi VPS/Nginx üzerinde çalıştırabilirsiniz.
- CORS varsayılan olarak açık (tüm origin'lere). İsterseniz `cors()` ayarlarını kısıtlayın.
