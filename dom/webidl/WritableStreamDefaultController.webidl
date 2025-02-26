/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://streams.spec.whatwg.org/#ws-default-controller-class-definition
 */

[Exposed=(Window,Worker,Worklet)]
interface WritableStreamDefaultController {
  [Throws]
  void error(optional any e);
};

// TODO: AbortSignal is not exposed on Worklet
[Exposed=(Window,Worker)]
partial interface WritableStreamDefaultController {
  readonly attribute AbortSignal signal;
};

