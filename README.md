# Tauri v2 Commands (VS Code Extension)

VS Code için **Tauri v2 CLI** (`https://v2.tauri.app/reference/cli/#list-of-commands`) komutlarını, proje oluşturma sihirbazını (`https://v2.tauri.app/start/`), zengin **Snippet** kütüphanesini, Flutter benzeri **Bağımlılık Yöneticisini (Crates & Plugins)** ve **Android APK/ABI/Sign** araçlarını içeren hepsi bir arada VS Code eklentisi.

---

## 🚀 Yeni Eklenen Özellikler

### 1. 🧩 Tauri Kod Parçacıkları (Snippets)
Rust, TypeScript, JavaScript, React, Vue, Svelte ve JSON dosyalarında doğrudan çalışan hazır şablonlar:

* **Rust (`.rs`):**
  * `tauri-command`: Standart Tauri v2 komut işleyicisi
  * `tauri-command-result`: `Result<T, String>` dönen komut
  * `tauri-command-async`: Asenkron komut işleyicisi
  * `tauri-command-state`: `tauri::State` ile yönetilen state kullanan komut
  * `tauri-command-app`: `tauri::AppHandle` parametreli komut
  * `tauri-main`: Tam `main.rs` giriş noktası şablonu
  * `tauri-setup`: Builder `.setup(|app| { ... })` bloğu ve Devtools açma
  * `tauri-emit`: Rust'tan frontend'e event fırlatma (`app.emit(...)`)
  * `tauri-listen`: Frontend event'lerini Rust'ta dinleme (`app.listen(...)`)

* **TypeScript / JavaScript (`.ts`, `.js`, `.tsx`, `.jsx`, `.svelte`, `.vue`):**
  * `tauri-invoke`: Rust komutunu çağırma (`invoke('cmd', { ... })`)
  * `tauri-listen`: Event dinleme (`listen('event', (e) => ... )`)
  * `tauri-emit`: Event gönderme (`emit('event', payload)`)
  * `tauri-dialog-open`: Yerel dosya seçme penceresi açma (`@tauri-apps/plugin-dialog`)
  * `tauri-dialog-message`: Sistem bilgi/hata mesaj kutusu
  * `tauri-fs-read` / `tauri-fs-write`: Dosya okuma ve yazma (`@tauri-apps/plugin-fs`)
  * `tauri-notify`: Sistem bildirimi gönderme (`@tauri-apps/plugin-notification`)
  * `tauri-store`: Kalıcı JSON key-value saklama (`@tauri-apps/plugin-store`)
  * `tauri-open-url`: Varsayılan tarayıcıda link açma (`@tauri-apps/plugin-shell`)

* **JSON (`tauri.conf.json`, `capabilities/*.json`):**
  * `tauri-conf`: Eksiksiz Tauri v2 yapılandırma şablonu
  * `tauri-capability`: v2 yetki ve izin capability JSON şablonu

---

### 2. 📦 Flutter Tarzı Bağımlılık Ekleme (`Tauri: Add Dependency`)
Flutter'ın `pubspec assist` eklentisi gibi çalışır:
* **Canlı crates.io Araması:**
  * Herhangi bir crate adını yazın (örn. `serde`, `tokio`, `rusqlite`, `reqwest`, `anyhow`...).
  * API üzerinden en popüler sonuçlar, son sürümler, indirme sayıları ve açıklamalarıyla listelenir.
  * Seçtiğinizde opsiyonel feature'ları sorup otomatik olarak `cargo add <crate>` komutunu çalıştırır.
* **Popüler Tauri Crate'leri:** Sık kullanılan crate'leri anında listeler ve tek tıkla ekler.
* **Resmi Tauri v2 Eklentileri:** `fs`, `dialog`, `notification`, `sql`, `store`, `updater`, `deep-link` vb. eklentileri arayüzden seçtirip `tauri add <plugin>` ile hem Rust hem frontend hem de permission tarafını tek seferde kurar.

---

### 3. 📱 Android Geliştirme, APK Derleme ve İmzalama (Sign)
Android için tam donanımlı araç seti:
* **`Tauri: Android Build APK (Split per ABI)`:**
  * `tauri android build --apk --split-per-abi`
  * Mimariye göre ayrılmış optimize APK'lar üretir (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`).
* **`Tauri: Android Build APK (Universal)`:**
  * `tauri android build --apk`
  * Tüm mimarileri içeren evrensel APK üretir.
* **`Tauri: Android Build AAB (Google Play)`:**
  * `tauri android build --aab`
  * Google Play Store yüklemesi için App Bundle üretir.
* **`Tauri: Android Sign & Keystore Setup`:**
  * **Yeni Keystore Üretme:** `keytool` ile otomatik 2048-bit RSA anahtarı oluşturur.
  * **Gradle Yapılandırması:** `src-tauri/gen/android/keystore.properties` dosyasını otomatik oluşturup Gradle'a bağlar.
  * **Mevcut Keystore Bağlama:** Var olan `.jks` dosyanızı projeye bağlar.

---

### 4. 🧹 Proje Bakım Komutları (Clean, Check, Clippy, Update)
* **`Tauri: Clean (Cargo & Build Cache)`:**
  * Rust `target` dizinini temizler (`cargo clean`) ve isteğe bağlı olarak frontend `dist/build/cache` klasörlerini sıfırlar.
* **`Tauri: Cargo Check`:**
  * `cargo check` ile ikili dosya üretmeden saniyeler içinde derleme hatalarını kontrol eder.
* **`Tauri: Cargo Clippy`:**
  * `cargo clippy` linter'ını çalıştırarak Rust kodunuzu iyileştirir.
* **`Tauri: Cargo Update`:**
  * `cargo update` ile `Cargo.lock` bağımlılıklarını günceller.

---

### 5. 🛠️ Proje Sihirbazı & CLI Komutları
* **`Tauri: Create New Project`:**
  * `https://v2.tauri.app/start/` paket yöneticileri: **pnpm**, **npm**, **yarn**, **bun**, **cargo**.
  * İnteraktif terminal sihirbazı veya hızlı şablon kurulumu (React, Vue, Svelte, Vanilla vb.).
* **Komut Paleti (`Ctrl+Shift+P`):**
  * `Tauri: Run CLI Command...`
  * `Tauri: Dev (Run)`
  * `Tauri: Build (Release & Debug)`
  * `Tauri: Bundle`
  * `Tauri: Info`
  * `Tauri: Init`
  * `Tauri: Generate Icons` (`tauri icon`)
  * `Tauri: Signer` (`tauri signer`)
  * `Tauri: Migrate (v1 to v2)`
* **Debug Menüsü:**
  * Run and Debug panelinde üst çubuktaki butonlar: `▶ Dev`, `📦 Build`, `🗑️ Clean`, `🛠️ Komutlar`.
  * `launch.json` içinde `"type": "tauri"` ile `F5` doğrudan `tauri dev` çalıştırır.
* **Durum Çubuğu:**
  * Sol altta `$(rocket) Tauri (pnpm)` butonu ile tek tıkla tüm menüye erişim.

---

## 🎮 Test Etme

1. Eklentiyi derleyin:
   ```bash
   npm run compile
   ```
2. VS Code içinde **F5** tuşuna basarak yeni bir **Extension Development Host** penceresi açın.
3. Açılan pencerede:
   * **`Ctrl+Shift+P`** tuşlarına basıp `Tauri: Add Dependency` seçeneğini deneyin.
   * `Tauri: Android...` veya `Tauri: Clean` komutlarını çalıştırın.
   * Bir `.rs` dosyasında `tauri-command`, `.ts` dosyasında `tauri-invoke` yazarak snippet'ları test edin.
