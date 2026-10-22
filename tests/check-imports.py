# Tarkistaa, että jokainen toisesta moduulista käytetty nimi on tuotu (import).
# Ajo: python3 tests/check-imports.py
import re, os, glob, sys
root = os.path.join(os.path.dirname(__file__), "..", "js")
files = glob.glob(os.path.join(root, "**", "*.js"), recursive=True)
exports, src = {}, {}
for f in files:
    s = open(f, encoding="utf-8").read(); src[f] = s
    for m in re.finditer(r"^export (?:async )?(?:function|const|let) ([\w$]+)", s, re.M): exports.setdefault(m.group(1), f)
    for m in re.finditer(r"^export \{([^}]*)\}", s, re.M):
        for n in m.group(1).split(","): exports.setdefault(n.strip(), f)
bad = 0
for f, s in src.items():
    imported = set()
    for m in re.finditer(r"^import \{([^}]*)\}", s, re.M): imported |= {n.strip() for n in m.group(1).split(",")}
    own = set(re.findall(r"^(?:export )?(?:async )?(?:function|const|let) ([\w$]+)", s, re.M))
    body = re.sub(r"^import .*$", "", s, flags=re.M)
    for n, owner in exports.items():
        if owner == f or n in imported or n in own: continue
        if re.search(r"(?:const|let|var)\s+" + re.escape(n) + r"\s*=", body): continue  # paikallinen muuttuja
        if re.search(r"[(,]\s*" + re.escape(n) + r"\s*[=,)]", body): continue  # funktion parametri
        if n == "$" and not re.search(r"(?<![\w$])\$\(", body): continue
        if re.search(r"(?:(?<=\.\.\.)|(?<![\w$.\"'#-]))" + re.escape(n) + r"(?![\w$\"'-])", body):
            # rajataan pois olioiden avaimet "nimi:" ja merkkijonot
            hits = [l for l in body.split("\n") if re.search(r"(?:(?<=\.\.\.)|(?<![\w$.\"'#-]))" + re.escape(n) + r"(?![\w$\"':-])", l) and not l.strip().startswith("//")]
            if hits: bad += 1; print(f"{os.path.relpath(f, root)}: '{n}' (from {os.path.relpath(owner, root)}) e.g. {hits[0].strip()[:90]}")
print("OK" if not bad else f"{bad} puuttuvaa tuontia"); sys.exit(1 if bad else 0)
