// Read-only APK inspector: signing block + minSdk/targetSdk/package from the binary manifest.
const fs = require('fs');
const zlib = require('zlib');
const buf = fs.readFileSync(process.argv[2]);

// 1) APK Signing Block (v2/v3) sits just before the ZIP central directory.
const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
const cdOffset = buf.readUInt32LE(eocd + 16);
const magic = buf.slice(cdOffset - 16, cdOffset).toString('latin1');
const sigBlock = magic === 'APK Sig Block 42';
let schemes = [];
if (sigBlock) {
  const size = Number(buf.readBigUInt64LE(cdOffset - 24));
  let p = cdOffset - size - 8 + 8;
  const end = cdOffset - 24;
  while (p < end) {
    const len = Number(buf.readBigUInt64LE(p));
    const id = buf.readUInt32LE(p + 8);
    if (id === 0x7109871a) schemes.push('v2');
    if (id === 0xf05368c0) schemes.push('v3');
    if (id === 0x1b93ad61) schemes.push('v3.1');
    p += 8 + len;
  }
}

// 2) Find AndroidManifest.xml in the central directory and inflate it.
let p = cdOffset, manifest = null;
const names = [];
while (buf.readUInt32LE(p) === 0x02014b50) {
  const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20);
  const nlen = buf.readUInt16LE(p + 28), elen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
  const lho = buf.readUInt32LE(p + 42);
  const name = buf.slice(p + 46, p + 46 + nlen).toString();
  names.push(name);
  if (name === 'AndroidManifest.xml') {
    const lnlen = buf.readUInt16LE(lho + 26), lelen = buf.readUInt16LE(lho + 28);
    const data = buf.slice(lho + 30 + lnlen + lelen, lho + 30 + lnlen + lelen + csize);
    manifest = method === 8 ? zlib.inflateRawSync(data) : data;
  }
  p += 46 + nlen + elen + clen;
}

// 3) Minimal AXML parse: string pool + start-element attributes.
const m = manifest;
let strings = [];
let off = 8;
const attrs = {};
while (off < m.length) {
  const type = m.readUInt16LE(off), hsize = m.readUInt16LE(off + 2), size = m.readUInt32LE(off + 4);
  if (type === 0x0001) {
    const count = m.readUInt32LE(off + 8), flags = m.readUInt32LE(off + 16), sstart = m.readUInt32LE(off + 20);
    const utf8 = (flags & 0x100) !== 0;
    for (let i = 0; i < count; i++) {
      let s = off + sstart + m.readUInt32LE(off + hsize + i * 4);
      if (utf8) {
        let n = m[s]; s += n & 0x80 ? 2 : 1;
        let bl = m[s]; if (bl & 0x80) { bl = ((bl & 0x7f) << 8) | m[s + 1]; s += 2; } else s += 1;
        strings.push(m.slice(s, s + bl).toString('utf8'));
      } else {
        let n = m.readUInt16LE(s); s += 2;
        if (n & 0x8000) { n = ((n & 0x7fff) << 16) | m.readUInt16LE(s); s += 2; }
        strings.push(m.slice(s, s + n * 2).toString('utf16le'));
      }
    }
  } else if (type === 0x0102) {
    const tag = strings[m.readUInt32LE(off + 20)];
    const ac = m.readUInt16LE(off + 28);
    for (let i = 0; i < ac; i++) {
      const a = off + 36 + i * 20;
      const an = strings[m.readUInt32LE(a + 4)];
      const raw = m.readInt32LE(a + 8);
      const dtype = m[a + 15], dval = m.readUInt32LE(a + 16);
      const val = raw >= 0 ? strings[raw] : dtype === 0x03 ? strings[dval] : dval;
      if (tag === 'uses-sdk' || (tag === 'manifest' && /package|versionCode|versionName/.test(an))) attrs[`${tag}.${an}`] = val;
      if (tag === 'uses-permission' && an === 'name') (attrs.permissions ??= []).push(String(val).replace('android.permission.', ''));
    }
  }
  off += size;
}
const v1 = names.some((n) => /^META-INF\/[^/]+\.(RSA|DSA|EC)$/.test(n)) && names.some((n) => /^META-INF\/[^/]+\.SF$/.test(n));
if (v1) schemes.unshift('v1');
const abis = [...new Set(names.filter((n) => n.startsWith('lib/')).map((n) => n.split('/')[1]))];
console.log(JSON.stringify({ signingBlock: sigBlock, schemes, abis, entries: names.length, ...attrs }, null, 1));
