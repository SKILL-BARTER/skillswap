/*
 * University e-mail gate — SkillSwap is for tertiary students only.
 *
 * An e-mail counts as a university address when its domain:
 *   - ends with ".edu"                        (berkeley.edu, nyu.edu, …)
 *   - ends with ".ac.xx" / ".edu.xx"          (ox.ac.uk, nus.edu.sg, u-tokyo.ac.jp, …)
 *   - is listed below, or listed in the ALLOWED_UNIVERSITY_DOMAINS environment
 *     variable (comma separated) — for countries whose universities use
 *     ordinary TLDs (e.g. tum.de, unistra.fr, uct.ac.za is covered by .ac.za).
 */

const KNOWN_UNIVERSITY_DOMAINS = new Set([
  // demo accounts
  'demo.edu',
  // US
  'berkeley.edu', 'stanford.edu', 'mit.edu', 'harvard.edu', 'nyu.edu', 'princeton.edu',
  'yale.edu', 'columbia.edu', 'uchicago.edu', 'upenn.edu', 'caltech.edu', 'cmu.edu',
  'ucla.edu', 'umich.edu', 'utexas.edu', 'gatech.edu', 'illinois.edu', 'washington.edu',
  'wisc.edu', 'purdue.edu', 'rutgers.edu', 'asu.edu', 'byu.edu', 'rice.edu', 'duke.edu',
  'northwestern.edu', 'cornell.edu', 'jhu.edu', 'usc.edu', 'nyu.edu', 'bu.edu', 'tufts.edu',
  'georgetown.edu', 'unc.edu', 'ufl.edu', 'uga.edu', 'ohio-state.edu', 'psu.edu', 'pitt.edu',
  'minnesota.edu', 'indiana.edu', 'iastate.edu', 'k-state.edu', 'okstate.edu', 'lsu.edu',
  'auburn.edu', 'alumni.stanford.edu',
  // UK & Ireland
  'ox.ac.uk', 'cam.ac.uk', 'imperial.ac.uk', 'ucl.ac.uk', 'lse.ac.uk', 'ed.ac.uk',
  'manchester.ac.uk', 'kcl.ac.uk', 'bris.ac.uk', 'warwick.ac.uk', 'gla.ac.uk',
  'leeds.ac.uk', 'nottingham.ac.uk', 'bham.ac.uk', 'southampton.ac.uk', 'sheffield.ac.uk',
  'tcd.ie', 'ucd.ie', 'nuigalway.ie',
  // Canada
  'utoronto.ca', 'ubc.ca', 'mcgill.ca', 'uwaterloo.ca', 'queensu.ca', 'ualberta.ca',
  'umontreal.ca', 'mcmaster.ca', 'uottawa.ca', 'dal.ca', 'sfu.ca', 'uvic.ca',
  // Australia / NZ
  'unimelb.edu.au', 'sydney.edu.au', 'anu.edu.au', 'unsw.edu.au', 'uq.edu.au',
  'monash.edu', 'adelaide.edu.au', 'uwa.edu.au', 'uts.edu.au', 'rmit.edu.au',
  'auckland.ac.nz', 'otago.ac.nz', 'vuw.ac.nz', 'canterbury.ac.nz',
  // Europe
  'ethz.ch', 'epfl.ch', 'uzh.ch', 'unibe.ch', 'tum.de', 'uni-muenchen.de', 'hu-berlin.de',
  'fu-berlin.de', 'tu-berlin.de', 'uni-heidelberg.de', 'uni-mannheim.de', 'rwth-aachen.de',
  'kit.edu', 'uni-bonn.de', 'uni-frankfurt.de', 'tu-darmstadt.de', 'uni-stuttgart.de',
  'ens.fr', 'polytechnique.edu', 'sorbonne-universite.fr', 'universite-paris-saclay.fr',
  'unistra.fr', 'univ-lyon1.fr', 'sciencespo.fr', 'hec.fr', 'inria.fr',
  'uva.nl', 'tudelft.nl', 'leidenuniv.nl', 'ru.nl', 'uu.nl', 'wur.nl',
  'kth.se', 'lunduniversity.lu.se', 'uu.se', 'chalmers.se', 'ki.se',
  'uio.no', 'ntnu.no', 'uib.no', 'helsinki.fi', 'aalto.fi', 'utu.fi',
  'ku.dk', 'au.dk', 'dtu.dk', 'sdu.dk', 'cbs.dk', 'uio.no',
  'uw.edu.pl', 'uj.edu.pl', 'agh.edu.pl', 'charles.cz', 'cuni.cz', 'cvut.cz',
  'bme.hu', 'elte.hu', 'univie.ac.at', 'tuwien.ac.at', 'tugraz.at',
  'upo.es', 'uam.es', 'ub.edu', 'upc.edu', 'uab.cat', 'uc3m.es', 'ucm.es',
  'unibo.it', 'unimi.it', 'polimi.it', 'polito.it', 'unipd.it', 'unipi.it', 'unifi.it', 'sapienza.it',
  'ulisboa.pt', 'up.pt', 'uminho.pt', 'uc.pt',
  // Asia
  'nus.edu.sg', 'ntu.edu.sg', 'smu.edu.sg', 'sutd.edu.sg',
  'hku.hk', 'ust.hk', 'cuhk.edu.hk', 'polyu.edu.hk', 'cityu.edu.hk', 'hkbu.edu.hk',
  'tsinghua.edu.cn', 'pku.edu.cn', 'fudan.edu.cn', 'sjtu.edu.cn', 'zju.edu.cn',
  'ustc.edu.cn', 'nju.edu.cn', 'whu.edu.cn', 'sysu.edu.cn',
  'u-tokyo.ac.jp', 'kyoto-u.ac.jp', 'osaka-u.ac.jp', 'tokyo-tech.ac.jp', 'keio.jp', 'waseda.jp',
  'snu.ac.kr', 'kaist.ac.kr', 'postech.ac.kr', 'yonsei.ac.kr', 'korea.ac.kr', 'skku.edu',
  'iitb.ac.in', 'iitd.ac.in', 'iitm.ac.in', 'iisc.ac.in', 'iitk.ac.in', 'iitkgp.ac.in', 'iitr.ac.in',
  'du.ac.in', 'jnu.ac.in', 'bhu.ac.in', 'amu.ac.in', 'nic.in',
  'uum.edu.my', 'um.edu.my', 'usm.my', 'utm.my', 'upm.edu.my', 'ukm.edu.my',
  'chula.ac.th', 'mahidol.ac.th', 'ku.th', 'cmu.ac.th',
  'ui.ac.id', 'ugm.ac.id', 'itb.ac.id', 'unpad.ac.id',
  'dlsu.edu.ph', 'upd.edu.ph', 'ateneo.edu',
  // Africa
  'uct.ac.za', 'wits.ac.za', 'up.ac.za', 'sun.ac.za', 'ru.ac.za', 'ukzn.ac.za', 'uwc.ac.za',
  'unilag.edu.ng', 'ui.edu.ng', 'unn.edu.ng', 'oauife.edu.ng', 'covenantuniversity.edu.ng',
  'mak.ac.ug', 'uonbi.ac.ke', 'strathmore.edu',
  // Middle East
  'tau.ac.il', 'huji.ac.il', 'technion.ac.il', 'bgu.ac.il', 'auman.ac.il',
  'sharif.edu', 'ut.ac.ir', 'tehran.ac.ir', 'ku.edu.sa', 'kfupm.edu.sa', 'ksu.edu.sa',
  'aub.edu.lb', 'aucegypt.edu', 'qu.edu.qa', 'uaeu.ac.ae', 'kustar.ac.ae',
  // Latin America
  'unam.mx', 'tec.mx', 'itam.mx', 'ipn.mx', 'udg.mx',
  'usp.br', 'unicamp.br', 'ufrj.br', 'ufmg.br', 'puc-rio.br', 'pucsp.br',
  'uchile.cl', 'puc.cl', 'uchile.cl', 'unal.edu.co', 'andes.edu.co', 'javeriana.edu.co',
  'uba.ar', 'udesa.edu.ar', 'utdt.edu', 'uc.cl', 'uniandes.edu.co',
]);

const EXTRA_DOMAINS = (process.env.ALLOWED_UNIVERSITY_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

// .ac.uk / .edu.au / .ac.jp / .edu.sg / .ac.nz … (but not look-alikes such as "evil.edu.com")
const ACADEMIC_COUNTRY_SUFFIX = /\.(ac|edu)\.[a-z]{2}$/;

export function isUniversityEmail(email) {
  const domain = String(email || '').toLowerCase().trim().split('@').pop() || '';
  if (!domain || !domain.includes('.')) return false;
  if (domain.endsWith('.edu')) return true;
  if (ACADEMIC_COUNTRY_SUFFIX.test(domain)) return true;
  return KNOWN_UNIVERSITY_DOMAINS.has(domain) || EXTRA_DOMAINS.includes(domain);
}

export const UNIVERSITY_EMAIL_REJECTION =
  'SkillSwap is for university students only — please use your university e-mail address ' +
  '(e.g. you@university.edu). Gmail, Outlook and other personal addresses are not accepted.';
