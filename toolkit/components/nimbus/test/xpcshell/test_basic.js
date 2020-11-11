// Ported from third_party/rust/nimbus-sdk/tests/test_fs_clients.rs

ChromeUtils.defineModuleGetter(this, "OS", "resource://gre/modules/osfile.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

add_task(async function test_nimbus() {
  do_get_profile();
  let path = OS.Path.join(OS.Constants.Path.profileDir, "nimbus.db");

  // XXX should really make this get the files already in
  // third_party/rust/nimbus-sdk/tests/experiments, but I've already
  // wasted too much time fighting with xpcshell.ini trying to make that
  // work...
  let testsDir = Services.io.newFileURI(do_get_file("experiments")).spec;

  // XXX rename file
  // XXX eslint hint
  // XXX should something assert because we're doing this on the main thread?
  let client = new NimbusClient(
    {
      appId: "123",
    },
    path,
    {
      serverUrl: testsDir,
      collectionName: "abcxyz",
      bucketName: "some-bucket",
    },
    { dummy: 8 }
  );

  // Get this working next
  let experiments = client.getActiveExperiments();
  Assert.equal(experiments.length, 1, "there should be one valid experiment");
  Assert.equal(experiments[0].slug, "secure-gold");
});
