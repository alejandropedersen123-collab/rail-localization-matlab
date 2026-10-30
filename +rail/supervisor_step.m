function d=supervisor_step(f,m,track,c,ar)
% Same point-margin supervisor for both plain configurations.
sigma=sqrt(f.P(1,1)); age=max(0,m.t-m.packetTime);
if ar.controls
    front=f.x(1)+3*sigma; speed=max(0,f.x(2)+3*sqrt(f.P(2,2)));
    rear=m.leaderRear-10-5*age;
else
    front=f.x(1); speed=max(0,f.x(2)); rear=m.leaderRear;
end
assumed=struct('brake',c.assumedBrake,'mu',1,'downhill',0);
required=rail.stopping_distance(c,assumed,speed)+c.reserve;
margin=rear-front-required;
stale=m.hasPeer && age>c.maxPacketAge;
unavailable=m.t-f.lastAccepted>c.maxMotionAge || sigma>c.maxSigma;
ambiguous=~track.known;
diagnostic=ar.controls && (stale || unavailable || ambiguous);
d=struct('margin',margin,'hazard',margin<=0,'diagnostic',diagnostic, ...
    'alert',margin<=0 || diagnostic,'stale',stale,'unavailable',unavailable, ...
    'ambiguous',ambiguous);
end
