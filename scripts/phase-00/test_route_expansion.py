"""Unit tests for static mapping expander; not authorization or Spring runtime tests."""
import importlib.util, pathlib, unittest
p=pathlib.Path(__file__).with_name("expand-route-mappings.py")
spec=importlib.util.spec_from_file_location("routeexpander",p)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

class StaticExpansionTests(unittest.TestCase):
    def event(self,typ,expr):
        return {"annotationType":typ,"sourceExpression":typ+"||"+expr}
    def test_komga_multi_path_multi_method(self):
        paths=[f'"/v1/example/{x}"' for x in range(9)]
        attr="@RequestMapping(value = {"+", ".join(paths)+"}, method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE, RequestMethod.PATCH})"
        m=mod.parse_mapping(self.event("RequestMapping",attr))
        self.assertEqual(len(m["paths"]),9)
        self.assertEqual(len(m["methods"]),5)
        self.assertEqual(len(m["paths"])*len(m["methods"]),45)
        self.assertEqual(m["unresolved"],[])
    def test_method_conditions_do_not_collapse(self):
        a=mod.parse_mapping(self.event("GetMapping","@GetMapping"))
        b=mod.parse_mapping(self.event("GetMapping",'@GetMapping(params = "isBook")'))
        self.assertEqual(a["paths"],b["paths"])
        self.assertNotEqual(a["conditions"],b["conditions"])
        self.assertEqual(b["conditions"]["params"]["literalValues"],["isBook"])
    def test_path_join(self):
        self.assertEqual(mod.join_paths("/api/kobo/{token}","/**"),"/api/kobo/{token}/**")
        self.assertEqual(mod.join_paths("/api/v1/app/books",""),"/api/v1/app/books")
        self.assertEqual(mod.join_paths("",""),"/")
    def test_symbolic_produces_requires_review(self):
        m=mod.parse_mapping(self.event("GetMapping",'@GetMapping(value = {"/a", "/b"}, produces = MediaType.IMAGE_JPEG_VALUE)'))
        self.assertEqual(m["paths"],["/a","/b"])
        self.assertIn("SYMBOLIC_PRODUCES",m["unresolved"])
    def test_unresolved_path_not_assumed(self):
        m=mod.parse_mapping(self.event("RequestMapping","@RequestMapping(value = SOME_CONSTANT)"))
        self.assertEqual(m["paths"],[])
        self.assertIn("NON_LITERAL_PATH",m["unresolved"])
    def test_method_readable(self):
        m=mod.parse_mapping(self.event("RequestMapping",'@RequestMapping(method = {RequestMethod.HEAD, RequestMethod.OPTIONS})'))
        self.assertEqual(m["methods"],["HEAD","OPTIONS"])
    def test_literal_array_with_commas_inside_quotes(self):
        m=mod.parse_mapping(self.event("GetMapping",'@GetMapping(path = {"/a,b", "/c"}, headers = {"X-Mode=one,two"})'))
        self.assertEqual(m["paths"],["/a,b","/c"])
        self.assertEqual(m["conditions"]["headers"]["literalValues"],["X-Mode=one,two"])
    def test_source_is_not_runtime(self):
        self.assertEqual(mod.VERBS["RequestMapping"],["ANY"])
        self.assertEqual(mod.join_paths("/komga/api","/**"),"/komga/api/**")

if __name__=="__main__":unittest.main()
