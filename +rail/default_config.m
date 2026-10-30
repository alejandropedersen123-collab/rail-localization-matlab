function c=default_config()
% Experimental values, not derived railway safety requirements.
c.dt=.2; c.speed=25; c.duration=110; c.leaderRear=1800;
c.faultStart=25; c.faultEnd=65;
c.gnssSigma=4; c.rangeSigma=8; c.odoSigma=.18;
c.accelSigma=.025; c.accelBias=.012;
c.assumedBrake=.45; c.actualBrake=.55; c.response=2; c.buildTime=1.5;
c.reserve=80; c.maxPacketAge=2; c.maxMotionAge=2;
c.maxSigma=30; c.nisGate=25; c.g=9.81;
c.trackConfidence=.995; c.mapResidualGate=5;
c.anchors=[-300 250;1100 -350;2800 300];
c.sensorFn=@rail.sensor_sample;
end
