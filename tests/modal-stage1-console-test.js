/* Stage 1 modal acceptance test. Run in DevTools with a modal open. */
(function () {
  'use strict';
  const modal = [...document.querySelectorAll('#modals > .modal')].find((el) => {
    const s = getComputedStyle(el);
    return !el.hidden && s.display !== 'none' && s.visibility !== 'hidden' && el.getClientRects().length;
  });
  if (!modal) throw new Error('TEST SETUP: open a modal first');
  const box = modal.querySelector(':scope > .modal-dialog, :scope > .modal-content');
  if (!box) throw new Error('FAIL: direct modal surface not found');
  const body = modal.querySelector('.modal-body');
  const r = box.getBoundingClientRect();
  const vv = window.visualViewport;
  const vw = vv ? vv.width : innerWidth, vh = vv ? vv.height : innerHeight;
  const vx = vv ? vv.offsetLeft : 0, vy = vv ? vv.offsetTop : 0;
  const dx = Math.abs(r.left + r.width / 2 - (vx + vw / 2));
  const dy = Math.abs(r.top + r.height / 2 - (vy + vh / 2));
  const owners = [['modal',modal],['dialog',modal.querySelector('.modal-dialog')],['content',modal.querySelector('.modal-content')],['body',body]]
    .filter(([,el]) => el).map(([name,el]) => { const s=getComputedStyle(el); return {name,overflowY:s.overflowY,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,active:el.scrollHeight>el.clientHeight+1 && /auto|scroll/.test(s.overflowY)}; });
  const failures=[];
  if(dx>2) failures.push(`X delta ${dx.toFixed(2)}px`);
  if(dy>2) failures.push(`Y delta ${dy.toFixed(2)}px`);
  if(r.left<vx-1 || r.top<vy-1 || r.right>vx+vw+1 || r.bottom>vy+vh+1) failures.push('surface escapes viewport');
  if(owners.some(x=>x.active && x.name!=='body')) failures.push('scroll owner exists above .modal-body');
  if(document.documentElement.scrollWidth>document.documentElement.clientWidth+1) failures.push('horizontal document overflow');
  const report={modalId:modal.id,viewport:{width:vw,height:vh},surface:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},deltaX:dx,deltaY:dy,scrollOwners:owners,failures};
  console.table(owners); console.log(report);
  if(failures.length) throw new Error('STAGE 1 FAIL: '+failures.join('; '));
  console.log('STAGE 1 PASS'); return report;
})();
