/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};

ChromeUtils.defineModuleGetter(
  lazy,
  "PreferenceFilters",
  "resource://gre/modules/components-utils/PreferenceFilters.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "Sampling",
  "resource://gre/modules/components-utils/Sampling.jsm"
);
ChromeUtils.defineModuleGetter(
  lazy,
  "mozjexl",
  "resource://gre/modules/components-utils/mozjexl.js"
);

var EXPORTED_SYMBOLS = ["FilterExpressions"];

function initJexlInterpreter(jexl) {
  jexl.addTransforms({
    date: dateString => new Date(dateString),
    stableSample: lazy.Sampling.stableSample,
    bucketSample: lazy.Sampling.bucketSample,
    preferenceValue: lazy.PreferenceFilters.preferenceValue,
    preferenceIsUserSet: lazy.PreferenceFilters.preferenceIsUserSet,
    preferenceExists: lazy.PreferenceFilters.preferenceExists,
    keys,
    length,
    mapToProperty,
    regExpMatch,
    versionCompare,
  });
  jexl.addBinaryOp("intersect", 40, operatorIntersect);
}

XPCOMUtils.defineLazyGetter(lazy, "jexl", () => {
  const jexl = new lazy.mozjexl.Jexl();
  initJexlInterpreter(jexl);
  return jexl;
});

/**
 * As of this writing, the new jexl interpreter has been built from mozilla/mozjexl on
 * and is _believed_ to behave identically to the one currently in mozilla-central,
 * _UNLESS_ it is passed an options object containing `throwOnMissingProp: true`,
 * in which case it will behave as described.
 *
 * For now, the intent is for this to _only_ be used in `evalThrowOnMissingProp` by
 * tests as well as integration tests in the Experimenter product.  XXX JIRA ticket here
 *
 * In the future, we'd also like this interpreter to replace the current one
 * (ie used by all methods in FilterExpressions), mostly so that we can fix bugs or make
 * changes if we need to, which is not really true today.  Initially for eval and
 * getTransforms, it would use the new code with the old behavior (i.e.
 * `throwOnMissingProp: true`).  The next step to getting there is running all eval calls
 * on both interpreters to convince ourselves that this won't regress things. XXXbug
 *
 * Making `evalThrowOnMissingProp` behavior the default for all callers so that these
 * errors could be easily caught at runtime for both Nimbus and FxMS is an even later
 * project than that.  XXXlink to JIRA ticket
 */
XPCOMUtils.defineLazyGetter(lazy, "newJexl", () => {
  // XXX switch to mozjexlNew
  const jexl = new lazy.mozjexl.Jexl({ throwOnMissingProp: true });
  initJexlInterpreter(jexl);
  return jexl;
});

var FilterExpressions = {
  jexl: null,
  newJexl: null,

  getAvailableTransforms() {
    return Object.keys(this.jexl._transforms);
  },

  evalThrowOnMissingProp(expr, context = {}) {
    if (!this.newJexl) {
      this.newJexl = lazy.newJexl;
    }
    const onelineExpr = expr.replace(/[\t\n\r]/g, " ");
    return this.mozjexlNew.eval(onelineExpr, context);
  },

  eval(expr, context = {}) {
    if (!this.jexl) {
      this.jexl = lazy.jexl;
    }
    const onelineExpr = expr.replace(/[\t\n\r]/g, " ");
    return this.jexl.eval(onelineExpr, context);
  },
};

/**
 * Return an array of the given object's own keys (specifically, its enumerable
 * properties), or undefined if the argument isn't an object.
 * @param {Object} obj
 * @return {Array[String]|undefined}
 */
function keys(obj) {
  if (typeof obj !== "object" || obj === null) {
    return undefined;
  }

  return Object.keys(obj);
}

/**
 * Return the length of an array
 * @param {Array} arr
 * @return {number}
 */
function length(arr) {
  return Array.isArray(arr) ? arr.length : undefined;
}

/**
 * Given an input array and property name, return an array with each element of
 * the original array replaced with the given property of that element.
 * @param {Array} arr
 * @param {string} prop
 * @return {Array}
 */
function mapToProperty(arr, prop) {
  return Array.isArray(arr) ? arr.map(elem => elem[prop]) : undefined;
}

/**
 * Find all the values that are present in both lists. Returns undefined if
 * the arguments are not both Arrays.
 * @param {Array} listA
 * @param {Array} listB
 * @return {Array|undefined}
 */
function operatorIntersect(listA, listB) {
  if (!Array.isArray(listA) || !Array.isArray(listB)) {
    return undefined;
  }

  return listA.filter(item => listB.includes(item));
}

/**
 * Matches a string against a regular expression. Returns null if there are
 * no matches or an Array of matches.
 * @param {string} str
 * @param {string} pattern
 * @param {string} flags
 * @return {Array|null}
 */
function regExpMatch(str, pattern, flags) {
  const re = new RegExp(pattern, flags);
  return str.match(re);
}

/**
 * Compares v1 to v2 and returns 0 if they are equal, a negative number if
 * v1 < v2 or a positive number if v1 > v2.
 * @param {string} v1
 * @param {string} v2
 * @return {number}
 */
function versionCompare(v1, v2) {
  return Services.vc.compare(v1, v2);
}
