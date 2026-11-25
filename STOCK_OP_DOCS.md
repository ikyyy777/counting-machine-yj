# Stock OP WebService Docs (React + TypeScript)

Dokumentasi API ditulis oleh: GPT 5.2

- `GetStockOperator` (SP: `dbo.CBC_WEB_GET_STOCK_OPERATOR`)
- `SetOpStatus` (SP: `dbo.CBC_WEB_SET_OP_STATUS`)
- `SaveStockOpRule` (SP: `dbo.CBC_STOCKOP_RULE_UPSERT`)

Catatan:

- Metode-metode ini dibuat dengan signature parameter sederhana (`string ...`) dan menulis JSON lewat `Context.Response.Write(...)`.
- Umumnya bisa dipanggil via `POST` dengan `application/x-www-form-urlencoded`.
- API: http://192.168.55.105:8971/WService.asmx

## Ringkas: endpoint & contoh payload

Semua endpoint dipanggil dengan:

```txt
POST {BASE_URL}/WService.asmx/{MethodName}
Content-Type: application/x-www-form-urlencoded
```

### 1) GetStockOperator

- **URL**: `/WService.asmx/GetStockOperator`
- **Method**: `POST`
- **Parameter yang dikirim** (form fields):

```json
{
  "FACTORY": "YONGJIN 2",
  "LINENO": "5",
  "STYLENO": "NF0A52AN(OUTER)",
  "DATEFROM": "2026-04-21"
}
```

- **Contoh response** (array):

```json
[
  {
    "WORK_DATE": "2026-04-21",
    "STYLE": "NF0A52AN(OUTER)",
    "MODULE": "JOIN",
    "NIK": "YJ2_027492",
    "E_NAME": "OPERATOR A",
    "ACTUAL": 120,
    "EMPNO": 1,
    "STOCK_OP": 30,
    "AVERAGE": 15,
    "SOURCE_TABLE": "LAYOUT_2",
    "OP_STATUS": "OUTPUT"
  }
]
```

### 2) SetOpStatus

- **URL**: `/WService.asmx/SetOpStatus`
- **Method**: `POST`
- **Parameter yang dikirim**:

```json
{
  "FACTORY": "YONGJIN 2",
  "LINENO": "5",
  "STYLENO": "NF0A52AN(OUTER)",
  "MODULE": "JOIN",
  "NIK": "YJ2_027492",
  "STATUS": "OUTPUT",
  "DATEFROM": "2026-04-21"
}
```

- **Contoh response** (array, biasanya 1 row):

```json
[
  {
    "SOURCE_TABLE": "LAYOUT_2",
    "PREP_ID": 123,
    "MODULE": "JOIN",
    "NIK": "YJ2_027492",
    "OP_STATUS_SET": "OUTPUT",
    "UPDATED_AT": "2026-04-21 16:40:00"
  }
]
```

### 3) SaveStockOpRule (UBAH RUMUS STOCK OP)

- **URL**: `/WService.asmx/SaveStockOpRule`
- **Method**: `POST`
- **Parameter yang dikirim**:

```json
{
  "FACTORY": "YONGJIN 2",
  "LINE_CODE": "5",
  "STYLE_NO": "NF0A52AN(OUTER)",
  "MODULE_FROM": "BACK",
  "MODULE_TO": "ASSEMBLY",
  "IS_ACTIVE": "1",
  "USERNAME": "admin"
}
```

- **Contoh response** (object):

```json
{
  "success": true,
  "message": "Stock OP rule saved successfully"
}