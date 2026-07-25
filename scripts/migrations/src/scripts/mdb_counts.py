import MDBReader

with MDBReader.MDBReader(r"D:\HD\MGV\MGV_2026\MGV-Assistência-Técnica\Dados.MDB") as mdb:
    for t in mdb.table_names():
        rows = list(mdb.get_table(t))
        print(f"{t:32s} {len(rows):6d}")
