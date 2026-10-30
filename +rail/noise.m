function n=noise(c,sc,seed)
% Pre-generated independent channels. Filters and actions never consume RNG.
rng(seed,'twister'); count=round(sc.duration/c.dt)+1;
n.gnss=randn(count,1); n.odo=randn(count,1); n.accel=randn(count,1);
n.range=randn(count,size(c.anchors,1)); n.lateral=randn(count,1);
end
