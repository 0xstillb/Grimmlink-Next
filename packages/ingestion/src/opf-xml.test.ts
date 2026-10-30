import { expect, it } from "vitest";
import { parseOpfPreview } from "./index.js";

const parse = (xml: string) => parseOpfPreview(Buffer.from(xml, "utf8"));

it("reads namespace aliases and OPF3 title, series and explicit cover refinements", () => {
  const result = parse(`<?xml version="1.0" encoding="UTF-8"?>
  <o:package xmlns:o="http://www.idpf.org/2007/opf" xmlns:book="http://purl.org/dc/elements/1.1/">
    <o:metadata>
      <book:title id="main">ชื่อหลัก</book:title>
      <book:title id="sub">ชื่อรอง</book:title>
      <o:meta refines="#main" property="title-type">main</o:meta>
      <o:meta refines="#sub" property="title-type">subtitle</o:meta>
      <book:description><![CDATA[ข้อความ & รายละเอียด]]></book:description>
      <book:language>th</book:language>
      <o:meta id="series" property="belongs-to-collection">ชุดหนังสือ</o:meta>
      <o:meta refines="#series" property="collection-type">series</o:meta>
      <o:meta refines="#series" property="group-position">2.5</o:meta>
    </o:metadata>
    <o:manifest><o:item id="cover" href="images/cover.png" media-type="image/png" properties="cover-image"/></o:manifest>
  </o:package>`);
  expect(result.metadata).toEqual({
    title: "ชื่อหลัก",
    subtitle: "ชื่อรอง",
    description: "ข้อความ & รายละเอียด",
    language: "th",
    seriesName: "ชุดหนังสือ",
    seriesNumber: 2.5,
  });
  expect(result.coverHref).toBe("images/cover.png");
});

it("does not treat a foreign namespace as Dublin Core", () => {
  const result = parse(
    '<package xmlns:other="urn:not-dc"><metadata><other:title>Wrong</other:title></metadata></package>',
  );
  expect(result.metadata).toEqual({});
});

it("rejects entities, malformed namespaces, duplicate IDs and ambiguous metadata", () => {
  const prefix = '<package xmlns:d="http://purl.org/dc/elements/1.1/"><metadata>';
  for (const xml of [
    '<!DOCTYPE package [<!ENTITY x SYSTEM "file:///secret">]><package><metadata/></package>',
    "<package><metadata><dc:title>unbound</dc:title></metadata></package>",
    `${prefix}<d:title>A</d:title><d:title>B</d:title></metadata></package>`,
    `${prefix}<d:title><em>mixed</em></d:title></metadata></package>`,
    `${prefix}<d:title id="same">A</d:title><d:title id="same">B</d:title></metadata></package>`,
    "<package><metadata/><metadata/></package>",
    "<package><metadata/><?unsafe data?></package>",
  ])
    expect(() => parse(xml)).toThrow();
  expect(() => parseOpfPreview(Uint8Array.from([0xff, 0xfe]))).toThrow("Invalid UTF-8 OPF");
});
