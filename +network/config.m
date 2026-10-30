function c=config()
% Educational operating assumptions. See docs/REAL_DATA.md for provenance.
c.dt=1; c.sampleSeconds=10; c.maxTime=6*3600;
c.blockLength=2000; c.stationHalfLength=250;
c.trainLength=200; c.trainMax=330/3.6; c.cruise=300/3.6;
c.acceleration=.45; c.serviceBrake=.60;
c.response=2; c.reserve=100; c.releaseMargin=10;
c.lookahead=12000; c.dwell=120; c.terminalDwell=60;
end
