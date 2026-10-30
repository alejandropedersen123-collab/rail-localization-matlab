function z=simulate(c,sc,n,ar,closedLoop)
t=(0:c.dt:sc.duration)'; count=numel(t);
fields={'truth','speed','estimate','estimatedSpeed','sigma','minEig','margin', ...
    'hazard','diagnostic','alert','stale','unavailable','ambiguous', ...
    'rejected','rejectedGNSS','rejectedRange','rejectedOdo','trackP1','trackID', ...
    'trackKnown','wrongConfidentTrack','sensorChecksum','command'};
z=struct('t',t); for j=1:numel(fields), z.(fields{j})=zeros(count,1); end
p=struct('s',0,'v',c.speed,'a',0); filter=[]; track=[]; command=Inf;
for k=1:count
    if k>1, p=rail.plant_step(p,t(k-1),c.dt,command,c,sc); end
    m=c.sensorFn(p,t(k),k,c,sc,n);
    [filter,ed]=rail.estimator_step(filter,m,c,ar);
    track=rail.track_step(track,m,c,sc);
    d=rail.supervisor_step(filter,m,track,c,ar);
    if closedLoop && d.alert && isinf(command), command=t(k); end
    z.truth(k)=p.s; z.speed(k)=p.v; z.estimate(k)=filter.x(1);
    z.estimatedSpeed(k)=filter.x(2); z.sigma(k)=sqrt(filter.P(1,1));
    z.minEig(k)=min(eig(filter.P)); z.margin(k)=d.margin;
    for name={'hazard','diagnostic','alert','stale','unavailable','ambiguous'}
        z.(name{1})(k)=d.(name{1});
    end
    for name={'rejected','rejectedGNSS','rejectedRange','rejectedOdo'}
        z.(name{1})(k)=ed.(name{1});
    end
    z.trackP1(k)=track.probability1; z.trackID(k)=track.identity;
    z.trackKnown(k)=track.known; z.wrongConfidentTrack(k)=track.known && track.identity~=sc.trueTrack;
    values=[m.accel m.odo m.gnss m.ranges m.lateral]; values(~isfinite(values))=0;
    z.sensorChecksum(k)=sum(values.*(1:numel(values))); z.command(k)=command;
end
end
