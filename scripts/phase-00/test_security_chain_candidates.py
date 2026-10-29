"""Source-only route-chain selection tests; these are not Spring runtime tests."""
import importlib.util,pathlib,unittest
p=pathlib.Path(__file__).with_name("audit-security-chain-candidates.py")
sp=importlib.util.spec_from_file_location("security_chain_candidates",p)
mod=importlib.util.module_from_spec(sp);sp.loader.exec_module(mod)
class CandidateTests(unittest.TestCase):
    def test_opds(self):
        v,_=mod.select("/api/v1/opds/catalog");self.assertEqual(v["chain"],"OPDS_BASIC")
    def test_komga(self):
        v,_=mod.select("/komga/api/v1/books/7");self.assertEqual(v["chain"],"KOMGA_BASIC")
    def test_ko_and_kobo(self):
        self.assertEqual(mod.select("/api/koreader/syncs/progress")[0]["chain"],"KOREADER_FILTER")
        self.assertEqual(mod.select("/api/kobo/synthetic/v1/library/2/state")[0]["chain"],"KOBO_FILTER")
    def test_jwt_api(self):
        self.assertEqual(mod.select("/api/v1/app/books/2/rating")[0]["chain"],"JWT_API")
        self.assertEqual(mod.select("/api/v1/reading-sessions")[0]["chain"],"JWT_API")
    def test_public_not_jwt(self):
        for p in ("/api/v1/auth/login","/api/v1/auth/refresh","/api/v1/auth/oidc/callback","/api/v1/setup"):
            self.assertEqual(mod.select(p)[0]["chain"],"STATIC_FALLBACK",p)
    def test_download_and_query_jwt(self):
        expected={"/api/v1/media/cover/2":"MEDIA_QUERY_JWT",
         "/api/v1/custom-fonts/2/file":"CUSTOM_FONT_QUERY_JWT",
         "/api/v1/epub/2/file/chapter":"EPUB_STREAM_QUERY_JWT",
         "/api/v1/audiobooks/2/stream/chapter":"AUDIO_STREAM_QUERY_JWT",
         "/api/v1/books/2/download":"DOWNLOAD_QUERY_JWT"}
        for path,chain in expected.items():
            self.assertEqual(mod.select(path)[0]["chain"],chain,path)
    def test_root_ambiguities_must_be_exposed(self):
        for path in ("/ws","/api/v1/opds","/api/v2/opds","/api/kobo"):
            ch,amb=mod.select(path)
            self.assertTrue(amb,path)
            self.assertEqual(ch["chain"],"STATIC_FALLBACK",path)
    def test_unlisted_template_fallback_denied_by_contract(self):
        ch,_=mod.select("/not-an-api")
        self.assertEqual(ch["chain"],"STATIC_FALLBACK")
    def test_source_representative_never_prod(self):
        self.assertEqual(mod.sample("/api/v1/books/{bookId}/files/*/download"),
                         "/api/v1/books/phase00synthetic/files/phase00synthetic/download")
if __name__=="__main__":unittest.main()
