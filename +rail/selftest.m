function checks=selftest(c)
% Physics and experimental-design checks; independent analytic expectations.
% Test the reference adapters independently of the adapter selected for a run.
requestedAdapter=c.sensorFn;
c.sensorFn=@rail.sensor_sample;
sc=rail.scenarios(); ar=rail.architectures(); passed=strings(0,1);
% Stop on flat ground with build-up: compare numerical trajectory to envelope.
for id=[1 8 14]
    expected=rail.stopping_distance(c,sc(id),c.speed);
    stops=zeros(1,2);
    for j=1:2
        h=c.dt/2^(j-1); p=struct('s',0,'v',c.speed,'a',0);
        for t=0:h:sc(id).duration
            p=rail.plant_step(p,t,h,0,c,sc(id));
            assert(p.v>=0,'Plant reversed after stop');
            if p.v==0, break; end
        end
        assert(p.v==0,'Plant did not stop within test horizon'); stops(j)=p.s;
    end
    assert(max(abs(stops-expected))<1e-6,'Stopping envelope and plant disagree');
    assert(abs(diff(stops))<1e-6,'Plant depends on integration step');
end
% Independent constant-deceleration limit when build time tends to zero.
instant=c; instant.buildTime=1e-6;
expected=c.speed*c.response+c.speed^2/(2*sc(1).brake);
assert(abs(rail.stopping_distance(instant,sc(1),c.speed)-expected)<1e-3);
passed(end+1)="Stopping physics / weak brakes / slope / adhesion / timestep";

% Known observation replay must not depend on architecture or monitor switch.
n=rail.noise(c,sc(1),1001); z=cell(4,1);
short=sc(1); short.duration=8;
for a=1:4, z{a}=rail.simulate(c,short,n,ar(a),false); end
for a=2:4
    assert(isequal(z{1}.sensorChecksum,z{a}.sensorChecksum));
    assert(isequal(z{1}.truth,z{a}.truth));
end
passed(end+1)="Identical replay observations in all four configurations";

% A transparent replacement must reproduce every state exactly.
sub=c; sub.sensorFn=@identityAdapter;
zz=rail.simulate(sub,short,n,ar(4),false);
assert(isequaln(z{4},zz),'Identity module substitution changed results');
% A real substitution removes ranges but preserves every remaining channel.
p=struct('s',50,'v',25,'a',0);
full=rail.sensor_sample(p,2,11,c,sc(1),n);
removed=rail.sensor_without_ranges(p,2,11,c,sc(1),n);
assert(all(isnan(removed.ranges)) && any(isfinite(full.ranges)));
assert(isequaln(rmfield(full,'ranges'),rmfield(removed,'ranges')));
selected=requestedAdapter(p,2,11,c,sc(1),n);
assert(isequal(fieldnames(full),fieldnames(selected)),'Selected adapter has incompatible schema');
sub.sensorFn=@rail.sensor_without_ranges;
without=rail.simulate(sub,short,n,ar(4),false);
assert(any(abs(without.estimate-z{4}.estimate)>1e-9),'Range substitution had no effect');
passed(end+1)="Sensor substitution: identity exact; no-range adapter isolates channels";

% A map alias is allowed to expose wrong confidence, never assumed solved.
for id=[7 12 13]
    n=rail.noise(c,sc(id),1001); p=struct('s',0,'v',25,'a',0);
    m=rail.sensor_sample(p,0,1,c,sc(id),n); tr=rail.track_step([],m,c,sc(id));
    if id==7, assert(~tr.known,'Parallel tracks unexpectedly resolved'); end
    if id==12, assert(tr.inconsistent && ~tr.known,'Displaced map not diagnosed'); end
    if id==13, assert(tr.known && tr.identity~=sc(id).trueTrack,'Alias blind spot not exposed'); end
end
passed(end+1)="Track hypotheses: ambiguity, inconsistent map and confident alias";

% Health monitoring must be separable from claimed collision hazards.
short=sc(9); short.duration=8; n=rail.noise(c,short,1001);
clear=rail.simulate(c,short,n,ar(4),true);
assert(~any(clear.hazard) && ~any(clear.diagnostic) && all(isinf(clear.command)));
short=sc(10); short.duration=32; n=rail.noise(c,short,1001);
loss=rail.simulate(c,short,n,ar(2),true);
assert(~any(loss.hazard) && any(loss.diagnostic) && any(isfinite(loss.command)));
passed(end+1)="Clear track: hazard alarms versus diagnostic-induced stops";

% Abrupt sensor faults and stale packets must trigger their intended mechanisms.
for id=[3 4 5 6]
    short=sc(id); short.duration=32; n=rail.noise(c,short,1001);
    fault=rail.simulate(c,short,n,ar(4),false);
    if id==3, assert(any(fault.rejectedGNSS)); end
    if id==4, assert(any(fault.rejectedRange)); end
    if id==5
        k=find(fault.diagnostic,1); assert(~isempty(k) && fault.t(k)<=short.faultStart+c.maxPacketAge+c.dt+1e-8);
    end
    if id==6
        k=find(fault.diagnostic,1); assert(~isempty(k) && fault.t(k)<=short.faultStart+c.maxMotionAge+c.dt+1e-8);
    end
end
passed(end+1)="GNSS/range rejection, stale-message and sensor-loss response";
checks=table(passed(:),'VariableNames',{'PassedCheck'});
end

function m=identityAdapter(varargin)
m=rail.sensor_sample(varargin{:});
end
