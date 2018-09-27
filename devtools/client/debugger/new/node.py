#!/usr/bin/env python

import buildconfig
import subprocess

def generate(output, node_script, *modules):
  node = buildconfig.substs['NODEJS'];
  cmd = [node, node_script]
  cmd.extend(modules)

  output = subprocess.check_output(cmd)

  # Process the node script output
  # Consider all lines starting with 'dep:' to be a dependency definition
  # and all others as lines to print
  deps = []
  for line in output.splitlines():
    if 'dep:' in line:
      deps.append(line.replace('dep:', ''))
    else:
      print(line)
  return set(deps)
