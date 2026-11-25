# Fitur Summary PO History

## Deskripsi
Halaman Summary menampilkan ringkasan data PO History dalam format yang lebih mudah dibaca dan dianalisis.

## Cara Akses
1. Buka halaman History
2. Pilih Line dan Date yang diinginkan
3. Klik tombol "Summary" (akan disabled jika line belum dipilih)
4. Sistem akan mengarahkan ke halaman Summary dengan URL: `/summary?line={line}&workdate={date}`

## Fitur yang Tersedia

### 1. Tabel Summary
- **File No**: Nomor file PO
- **Style**: Kode style produk
- **Color**: Warna produk
- **Buyer**: Pembeli/pelanggan
- **Season**: Musim produksi
- **CRD**: Customer Required Date
- **Order Qty**: Jumlah pesanan
- **Total P Qty**: Total produksi (jika tersedia)
- **Balance Qty**: Sisa quantity (jika tersedia)

### 2. Detail Expandable
- Setiap baris dapat di-expand untuk melihat detail per size
- Menampilkan data per proses: Input Module, QC End Line, Hangtag, Polybag, Packing
- Data size ditampilkan dalam format yang mudah dibaca

### 3. Summary Totals
- Total untuk setiap proses (Input Module, QC End Line, Hangtag, Polybag)
- Ditampilkan dalam card berwarna untuk memudahkan identifikasi

## API Endpoint
```
GET /WService.asmx/SUMMARY_PO_HISTORY?line={line}&workdate={date}
```

## Response Format
```json
[
  {
    "Col_FileNo": "LW4CMDSWI5",
    "Col_Style": "LW4CMDS",
    "Col_Color": "034697-BLACK PLUM",
    "Col_Buyer": "LULULEMON",
    "Col_Season": "WI25",
    "Col_CRD": "2025-01-20 00:00:00.000",
    "OrderQty": 12256,
    "TotalPQty": null,
    "BalanceQty": null,
    "Detail": "[{\"Col_Size\":\"\",\"CB_Output\":0,\"INPUT_MODULE\":\"\",\"QC_END_LINE\":\"\",\"HANGTAG\":\"\",\"POLYBAG\":\"\",\"PACKING\":\"\"}]"
  }
]
```

## Navigasi
- Tombol "← Kembali ke History" untuk kembali ke halaman History
- Halaman Summary hanya dapat diakses dengan parameter line dan workdate yang valid

## Error Handling
- Menampilkan pesan error jika API gagal
- Validasi parameter line dan workdate
- Loading state saat mengambil data
- Fallback untuk data yang tidak tersedia

## Styling
- Menggunakan tema dark yang konsisten dengan aplikasi
- Responsive design untuk berbagai ukuran layar
- Hover effects dan transisi yang smooth
- Color coding untuk summary totals 