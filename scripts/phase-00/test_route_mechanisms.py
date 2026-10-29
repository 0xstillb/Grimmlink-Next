"""Narrow negative fixtures for NEW-P0-01 source-wide mechanism and inheritance classifier."""
import importlib.util,pathlib,unittest
P=pathlib.Path(__file__).with_name("audit-route-mechanisms.py")
spec=importlib.util.spec_from_file_location("route_mechanisms",P)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def row(s):return {"classDeclarations":[{"astDeclaration":s}]}
class TestRouteMechanisms(unittest.TestCase):
 def test_known_web_config_interface(self):
  self.assertEqual(m.inherited_endpoint_candidates(row("kind=CLASS;extends=null;implements=WebMvcConfigurer")),["WebMvcConfigurer"])
 def test_unknown_handler_mapping_must_be_flagged(self):
  self.assertEqual(m.inherited_endpoint_candidates(row("kind=CLASS;extends=AbstractHandlerMapping;implements=")),["AbstractHandlerMapping"])
 def test_real_http_controller_extension_is_detected(self):
  self.assertEqual(m.inherited_endpoint_candidates(row("kind=CLASS;extends=Controller;implements=")),["Controller"])
 def test_repository_not_an_http_route(self):
  self.assertEqual(m.inherited_endpoint_candidates(row("kind=INTERFACE;extends=null;implements=JpaRepository<Book,Long>")),[])
 def test_programmatic_and_ws_patterns(self):
  for text in ("RouterFunctions.route(GET('/x'), handler)", "new ServletRegistrationBean<>(s)",
      "@ServerEndpoint('/ws')","@HttpExchange('/foo')","registry.addViewController('/foo')"):
   self.assertRegex(text,m.DYNAMIC)
 def test_existing_config_is_owned_separately(self):
  self.assertNotRegex('registry.addResourceHandler("/**")',m.DYNAMIC)
  self.assertNotRegex('registry.addEndpoint("/ws")',m.DYNAMIC)
if __name__=="__main__":unittest.main()
