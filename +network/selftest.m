function checks=selftest(results)
% Regression checks for physics, exclusivity and complete scenario behaviour.
% Pass saved full results to also validate integration, without rerunning them.
c=network.config(); n=network.infrastructure(c); tr=network.timetable(n,c);
passed=strings(0,1);
for h=[.25 1 3]
    s=0; v=83.3333333333;
    expected=v^2/(2*.6);
    while v>0, [s,v]=network.advance(s,v,-.6,h); end
    assert(abs(s-expected)<1e-6,'Stopping distance differs from analytic v^2/(2b).');
    [s2,v2]=network.advance(s,v,-.6,h);
    assert(s2==s && v2==0,'Stopped train reversed.');
end
passed(end+1)="Analytic stopping distance at three integration steps";
assert(abs(tr(1).length-512041)<.001 && abs(tr(2).length-470500)<.001);
assert(abs(tr(3).length-569390)<.001);
assert(all(diff(tr(3).offsets)>0));
for e=1:height(n.edges)
    b=n.blocks{e}; middle=b(:,1)>=c.stationHalfLength & b(:,2)<=n.edges.Length_km(e)*1000-c.stationHalfLength;
    if n.edges.Tracks(e)==1, assert(all(b(middle,3)==b(middle,4)));
    else, assert(all(b(:,3)~=b(:,4))); end
end
passed(end+1)="Route sums and directional/shared resources";
% Two arriving routes request the very same junction, in either service order.
for first=[1 2]
    owner=zeros(1,1); a=struct('length',3000,'demands',[1 1000 1500 3]);
    [auth1,owner]=network.dispatch(a,0,-200,first,owner,true,c);
    [auth2,owner]=network.dispatch(a,0,-200,3-first,owner,true,c);
    assert(auth1>1500 && auth2==1000 && owner(1)==first);
    % Retain until the rear, not the front, clears with the explicit margin.
    [~,owner]=network.dispatch(a,1700,1500,first,owner,false,c);
    assert(owner(1)==first);
    [~,owner]=network.dispatch(a,1711,1511,first,owner,false,c);
    assert(owner(1)==0);
end
passed(end+1)="Exclusive merge grant and rear-clear release";
owner=[1;0]; a=struct('length',6000,'demands',[1 0 2000 1;2 2000 4000 1]);
[auth,owner]=network.dispatch(a,1000,800,1,owner,false,c);
assert(auth==2000 && isequal(owner,[1;0]));
[auth,owner]=network.dispatch(a,1000,800,1,owner,true,c);
assert(auth>4000 && all(owner==1));
passed(end+1)="Outage freezes extensions and preserves existing grants";
% Long single-track section is protected before an opposite train can enter.
e=12; token=n.tokens(e); i=find(tr(7).edges==e); k=find(tr(3).edges==e);
s1=tr(7).offsets(i); s2=tr(3).offsets(k);
owner=zeros(numel(n.resources),1);
[~,owner]=network.dispatch(tr(7),s1,s1-200,7,owner,true,c);
[auth,owner]=network.dispatch(tr(3),s2,s2-200,3,owner,true,c);
assert(owner(token)==7 && auth<=s2+c.stationHalfLength);
passed(end+1)="Opposing single-track entry remains outside the shared section";
% Independent speed-boundary check: 300 -> 220 km/h at edge 5.
t=tr(5); j=find(t.edges==5); boundary=t.offsets(j);
s=boundary-6000; v=300/3.6;
while s<boundary+1000
    [target,~]=network.speed_target(t,s,v,t.length+500,t.length,n,c);
    a=max(-c.serviceBrake,min(c.acceleration,(target-v)/c.dt));
    [s,v]=network.advance(s,v,a,c.dt);
    if s>=boundary, assert(v<=220/3.6+.05,'Failed to brake before reduced cap.'); end
end
passed(end+1)="Anticipatory braking at a lower speed boundary";
if nargin>0
    assert(numel(results)==3,'Integration checks expect the three standard cases.');
    for k=1:numel(results)
        r=results{k}; au=r.audit;
        assert(au.Completed==8 && au.MaximumActive==8);
        assert(au.BlockConflicts==0 && au.AuthorityViolations==0 && au.SpeedLimitViolations==0);
        assert(all(r.trace(end,:,3)==3),'Viewer does not include the final state.');
        assert(all(r.summary.MaxSpeed_kmh<=300+.18));
        assert(all(r.summary.Arrival_s>r.summary.Departure_s));
        assert(au.MinimumLeaderGap_m>0);
    end
    assert(all(results{2}.summary.Arrival_s>results{1}.summary.Arrival_s));
    sr=results{3}.stationRecords;
    assert(sr{find(strcmp(sr(:,2),'SIM01'),1),5}==1320);
    assert(results{3}.summary.Arrival_s(1)>results{1}.summary.Arrival_s(1));
    passed(end+1)="Three complete eight-train scenarios and visible disturbance effects";
end
passed=passed(:);
checks=table(passed,true(size(passed)),'VariableNames',{'Check','Passed'});
end
