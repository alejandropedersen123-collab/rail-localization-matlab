function track=track_step(track,m,c,sc)
% Two straight hypotheses ONLY; no complete network or turnout model.
% Per-observation likelihood avoids accumulating correlated samples forever.
if sc.mapMode=="trusted"
    track=struct('probability1',1,'identity',1,'known',true,'inconsistent',false,'last',m.t);
    return;
end
if isempty(track)
    track=struct('probability1',.5,'identity',0,'known',false,'inconsistent',false,'last',-Inf);
end
if isfinite(m.lateral)
    residual=m.lateral-[sc.mapOffset sc.mapOffset+sc.trackSeparation];
    logp=-.5*(residual/sc.lateralSigma).^2; logp=logp-max(logp);
    prob=exp(logp)/sum(exp(logp)); [confidence,id]=max(prob);
    track.inconsistent=min(abs(residual))/sc.lateralSigma>c.mapResidualGate;
    track.known=confidence>=c.trackConfidence && ~track.inconsistent;
    track.identity=id; track.probability1=prob(1); track.last=m.t;
end
if m.t-track.last>c.maxMotionAge, track.known=false; end
end
