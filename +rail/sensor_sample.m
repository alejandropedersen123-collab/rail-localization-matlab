function m=sensor_sample(p,t,k,c,sc,n)
% Truth is visible ONLY to this synthetic observation adapter.
fault=t>=sc.faultStart && t<sc.faultEnd;
lost=sc.fault=="motion_loss" && t>=sc.faultStart;
slowBias=0;
if sc.fault=="common_drift" && t>=sc.faultStart
    slowBias=-.7*min(t-sc.faultStart,sc.faultEnd-sc.faultStart);
end
m=struct('t',t,'accel',p.a+c.accelBias+c.accelSigma*n.accel(k), ...
    'odo',p.v+c.odoSigma*n.odo(k),'gnss',NaN, ...
    'ranges',nan(1,size(c.anchors,1)),'lateral',NaN, ...
    'leaderRear',Inf,'packetTime',floor(t+1e-9),'hasPeer',sc.hasObstacle);
if lost, m.accel=NaN; m.odo=NaN; end
if sc.fault=="wheel_slip" && fault, m.odo=m.odo-8; end
if mod(k-1,round(1/c.dt))==0 && ~lost
    if ~(sc.fault=="gnss_outage" && fault)
        m.gnss=p.s+slowBias+c.gnssSigma*n.gnss(k);
        if sc.fault=="gnss_jump" && fault, m.gnss=m.gnss-400; end
    end
    for j=1:size(c.anchors,1)
        m.ranges(j)=hypot(p.s+slowBias-c.anchors(j,1),c.anchors(j,2))+c.rangeSigma*n.range(k,j);
    end
    if sc.fault=="range_outlier" && fault, m.ranges(2)=m.ranges(2)+1000; end
    m.lateral=sc.lateralSigma*n.lateral(k);
end
if sc.hasObstacle, m.leaderRear=c.leaderRear; end
if sc.fault=="stale" && t>=sc.faultStart
    m.leaderRear=5000; m.packetTime=sc.faultStart-1;
end
% A fresh but false occupancy report: no obstacle in the ground truth.
if sc.fault=="phantom_peer" && t>=sc.faultStart
    m.hasPeer=true; m.leaderRear=1000;
end
end
