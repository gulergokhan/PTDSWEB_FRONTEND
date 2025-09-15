import { useEffect, useState } from "react";
import { fetchStaffPage, StaffDto } from "../api/staff";

export default function StaffList() {
  const [rows, setRows] = useState<StaffDto[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const page = await fetchStaffPage(0, 100);
        setRows(page.content);
        setMsg(`Total: ${page.totalElements}`);
      } catch (e:any) {
        setMsg(e?.response?.data?.message ?? e.message ?? "Fetch error");
      }
    })();
  }, []);

  return (
    <div style={{padding:16}}>
      <h2>Staff</h2>
      <div style={{marginBottom:8}}>{msg}</div>
      <table width="100%" border={1} cellPadding={6} style={{borderCollapse:"collapse"}}>
        <thead>
          <tr>
            <th>Ad</th><th>Soyad</th><th>Bölüm</th><th>Ünvan</th><th>Email</th><th>Telefon</th><th>TC</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.firstName}</td>
              <td>{r.lastName}</td>
              <td>{r.department}</td>
              <td>{r.title}</td>
              <td>{r.email}</td>
              <td>{r.phoneNumber}</td>
              <td>{r.tcKn}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
