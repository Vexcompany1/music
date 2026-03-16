/**
 * ─────────────────────────────────────────────────────────────────
 * Database AUTH Pagaska — dipakai oleh login.html via script src
 * Struktur: Map() persis sama dengan versi asli db.js
 * Supabase TIDAK dipakai di sini — hanya untuk data musik (index.html)
 * ─────────────────────────────────────────────────────────────────
 */

const users = new Map();
const chats = new Map();

// ── Data Generasi Pagaska (Pre-populated) ──────────────────────
const pagaskaGenerations = {
  1: [
    { nama: "Ryan Yazid Hidayatullah", jabatan: "Ketua Umum" },
    { nama: "Sekar Rutikasari",        jabatan: "Wakil Ketua Umum" },
    { nama: "Hudaifa Ulil",            jabatan: "Sekretaris" },
    { nama: "Febyola",                 jabatan: "Bendahara" },
  ],
  2: [
    { nama: "Rizky Indra Permana",     jabatan: "Ketua Umum" },
    { nama: "Dwi Bella Noviyanti",     jabatan: "Wakil Ketua" },
    { nama: "Anastasya Putri Gianto",  jabatan: "Sekretaris" },
  ],
  3: [
    { nama: "Afrizal",                 jabatan: "Ketua Umum" },
    { nama: "Fatimah Az-Zahra",        jabatan: "Wakil Ketua" },
    { nama: "Nazuwa",                  jabatan: "Sekretaris" },
  ],
  4: [
    { nama: "Putri",   jabatan: "Anggota", tipe: "gratis" },
    { nama: "Mariska", jabatan: "Anggota", tipe: "gratis" },
    { nama: "Yolanda", jabatan: "Anggota", tipe: "gratis" },
  ],
};

// ── Pre-register Gen 1–3 ───────────────────────────────────────
[1, 2, 3].forEach(gen => {
  pagaskaGenerations[gen].forEach((user, idx) => {
    const id = `gen${gen}_${idx}`;
    users.set(id, {
      id,
      nama:      user.nama,
      jabatan:   user.jabatan,
      generasi:  gen,
      tipe:      'jabatan',
      createdAt: new Date().toISOString(),
    });
  });
});

// ── Pre-register Gen 4 ─────────────────────────────────────────
pagaskaGenerations[4].forEach((user, idx) => {
  const id = `gen4_${idx}`;
  users.set(id, {
    id,
    nama:      user.nama,
    jabatan:   user.jabatan,
    generasi:  4,
    tipe:      'gratis',
    createdAt: new Date().toISOString(),
  });
});

// ── Export (CommonJS — dipakai Node.js / di-bundle) ────────────
// CATATAN: login.html membaca file ini, lalu meng-embed data-nya
// langsung sebagai JSON supaya bisa jalan pure di browser (no Node).
// Kalau pakai bundler (Vite/Webpack), import ini langsung.

if (typeof module !== 'undefined' && module.exports) {
  // ── Node.js / server environment ──
  module.exports = {
    users,
    chats,
    pagaskaGenerations,

    findUserByCredentials(nama, jabatan, generasi) {
      for (const [, user] of users) {
        if (user.generasi !== parseInt(generasi)) continue;
        if (
          user.nama.toLowerCase()    === nama.toLowerCase() &&
          user.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) return user;
      }
      return null;
    },

    // Daftar anggota baru (runtime — hilang saat restart)
    registerUser(nama, jabatan, generasi) {
      const gen = parseInt(generasi);
      // Cek duplikat
      for (const [, u] of users) {
        if (
          u.generasi === gen &&
          u.nama.toLowerCase()    === nama.toLowerCase() &&
          u.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) return { ok: false, message: 'Sudah terdaftar' };
      }
      const id = `reg_${Date.now()}`;
      users.set(id, {
        id,
        nama,
        jabatan,
        generasi: gen,
        tipe:     'anggota_baru',
        createdAt: new Date().toISOString(),
      });
      return { ok: true, user: users.get(id) };
    },

    getAllUsers() {
      return [...users.values()];
    },

    saveChat(userId, messages) {
      const userChats = chats.get(userId) || [];
      const session = {
        id:        Date.now().toString(),
        userId,
        messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      userChats.push(session);
      chats.set(userId, userChats);
      return session;
    },

    getUserChats(userId) {
      return chats.get(userId) || [];
    },

    deleteChat(userId, chatId) {
      const filtered = (chats.get(userId) || []).filter(c => c.id !== chatId);
      chats.set(userId, filtered);
      return true;
    },
  };
}

/**
 * ── BROWSER EXPORT ────────────────────────────────────────────
 * login.html mem-bundle data ini sebagai window.PAGASKA_DB
 * supaya tidak perlu server / Node.js sama sekali.
 *
 * Cara kerja:
 *   login.html include <script src="_lib/db.js"></script>
 *   lalu baca window.PAGASKA_DB.pagaskaGenerations
 */
if (typeof window !== 'undefined') {
  window.PAGASKA_DB = {
    pagaskaGenerations,

    // Anggota yang daftar runtime (browser session)
    _extraUsers: JSON.parse(localStorage.getItem('pgsk_extra_users') || '[]'),

    findUserByCredentials(nama, jabatan, generasi) {
      const gen = parseInt(generasi);
      // Cari di data bawaan
      for (const u of (pagaskaGenerations[gen] || [])) {
        if (
          u.nama.toLowerCase()    === nama.toLowerCase() &&
          u.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) {
          return {
            id:       `gen${gen}_${u.nama.replace(/\s+/g,'_').toLowerCase()}`,
            nama:     u.nama,
            jabatan:  u.jabatan,
            generasi: gen,
            tipe:     u.tipe || 'jabatan',
          };
        }
      }
      // Cari di extra (registrasi baru)
      for (const u of this._extraUsers) {
        if (
          u.generasi === gen &&
          u.nama.toLowerCase()    === nama.toLowerCase() &&
          u.jabatan.toLowerCase() === jabatan.toLowerCase()
        ) return u;
      }
      return null;
    },

    registerUser(nama, jabatan, generasi) {
      const gen = parseInt(generasi);
      if (this.findUserByCredentials(nama, jabatan, gen)) {
        return { ok: false, message: 'Sudah terdaftar! Langsung masuk saja.' };
      }
      const newUser = {
        id:        `reg_${Date.now()}`,
        nama,
        jabatan,
        generasi:  gen,
        tipe:      'anggota_baru',
        createdAt: new Date().toISOString(),
      };
      this._extraUsers.push(newUser);
      localStorage.setItem('pgsk_extra_users', JSON.stringify(this._extraUsers));
      return { ok: true, user: newUser };
    },

    getAllUsers() {
      const built = [];
      for (const [gen, list] of Object.entries(pagaskaGenerations)) {
        list.forEach((u, i) => built.push({
          id:       `gen${gen}_${i}`,
          nama:     u.nama,
          jabatan:  u.jabatan,
          generasi: parseInt(gen),
          tipe:     u.tipe || 'jabatan',
        }));
      }
      return [...built, ...this._extraUsers];
    },
  };
}
