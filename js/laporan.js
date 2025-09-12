let allData = [];
let filteredData = [];

document.addEventListener("DOMContentLoaded", () => {
  fetch("data/juni2025.csv")
    .then((res) => res.text())
    .then((csv) => {
      const parsed = Papa.parse(csv, {
        header: true,
        skipEmptyLines: true,
      });
      allData = parsed.data;
      filterBulan(); // tampilkan default
    });
});

function parseTanggal(tglStr) {
  if (!tglStr) return null;
  const [dd, mm, yyyy] = tglStr.split("/");
  return new Date(`${yyyy}-${mm}-${dd}`);
}

function dapatkanJenisLaundry(row) {
  const jenisList = ["REG", "EXP", "EXP 1 H", "EXP 2 H", "CL", "SET", "SAT"];
  return jenisList.find((j) => row[j]?.trim()) || "";
}

function ambilKg(row) {
  return (
    parseFloat(row["KG"]?.replace(",", ".") || "") ||
    parseFloat(row["SAT"]?.replace(",", ".") || "") ||
    parseFloat(row["SET"]?.replace(",", ".") || "") ||
    0
  );
}

function ambilSetrika(row) {
  return row["SETRIKA"]?.trim() || "";
}

function filterBulan() {
  const bulan = document.getElementById("bulanSelect").value;
  if (!bulan) {
    filteredData = allData;
  } else {
    filteredData = allData.filter((row) => {
      const tgl = parseTanggal(row["TERIMA"]);
      return tgl && tgl.getMonth() + 1 === parseInt(bulan);
    });
  }
  renderTable();
}

function renderTable() {
  if (!filteredData.length) {
    document.getElementById("reportContainer").innerHTML =
      "<p>Tidak ada data untuk ditampilkan.</p>";
    return;
  }

  const groupedByDate = {};

  filteredData.forEach((row) => {
    const tgl = parseTanggal(row["TERIMA"]);
    if (!tgl) return;

    const key = tgl.toISOString().split("T")[0];
    if (!groupedByDate[key]) groupedByDate[key] = [];
    groupedByDate[key].push(row);
  });

  let html = "";

  Object.keys(groupedByDate)
    .sort()
    .forEach((tgl) => {
      const rows = groupedByDate[tgl];
      const formattedDate = new Date(tgl).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      let totalHarga = 0;
      let totalKg = 0;

      html += `<h3>${formattedDate}</h3>`;
      html += `<table>
        <thead>
          <tr>
            <th>NOTA</th>
            <th>PELANGGAN</th>
            <th>TANGGAL TERIMA</th>
            <th>TANGGAL SELESAI</th>
            <th>HARGA</th>
            <th>KODE</th>
            <th>JENIS LAUNDRY</th>
            <th>KG</th>
            <th>NAMA SETRIKA</th>
          </tr>
        </thead>
        <tbody>`;

      rows.forEach((row) => {
        const harga =
          parseInt((row["Rp"] || "").replace(/[^0-9]/g, "")) || 0;
        const kg = ambilKg(row);
        const setrika = ambilSetrika(row);
        const jenis = dapatkanJenisLaundry(row);

        totalHarga += harga;
        totalKg += kg;

        html += `
          <tr>
            <td>${row["NOTA"] || ""}</td>
            <td>${row["PELANGGAN"] || ""}</td>
            <td>${row["TERIMA"] || ""}</td>
            <td>${row["SELESAI"] || ""}</td>
            <td>Rp ${harga.toLocaleString("id-ID")}</td>
            <td>${row["KODE"] || ""}</td>
            <td>${jenis}</td>
            <td>${kg}</td>
            <td>${setrika}</td>
          </tr>`;
      });

      html += `
        <tr class="total-row">
          <td colspan="4">Total</td>
          <td colspan="2">Rp ${totalHarga.toLocaleString("id-ID")}</td>
          <td colspan="3">${totalKg.toFixed(1)} Kg</td>
        </tr>`;

      html += `</tbody></table><br/>`;
    });

  document.getElementById("reportContainer").innerHTML = html;
}

function exportCSV() {
  const csv = Papa.unparse(filteredData);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "laporan_laundry.csv";
  link.click();
}

function printReport() {
  const w = window.open();
  w.document.write(`
    <html>
      <head>
        <title>Cetak Laporan</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #333; padding: 8px; text-align: center; }
          th { background: #eee; }
          .total-row { font-weight: bold; background: #f9f9f9; }
        </style>
      </head>
      <body>${document.getElementById("reportContainer").innerHTML}</body>
    </html>
  `);
  w.document.close();
  w.print();
}
