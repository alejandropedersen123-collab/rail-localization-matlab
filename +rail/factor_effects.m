function effects=factor_effects(S)
% Contrasts, not a claim of statistical significance or population causality.
% Negative differences favor the second configuration for RMSE/collisions.
rows=struct([]); pairs=[1 2;3 4;1 3;2 4];
labels=["Controls with GPS","Controls with fusion","Fusion without controls","Fusion with controls"];
for j=1:max(S.ScenarioID)
    x=S(S.ScenarioID==j,:);
    for k=1:4
        a=pairs(k,1); b=pairs(k,2);
        r=struct('Scenario',x.Scenario(1),'Contrast',labels(k), ...
            'From',x.Architecture(a),'To',x.Architecture(b), ...
            'DeltaRMSE_m',x.OpenRMSE_m(b)-x.OpenRMSE_m(a), ...
            'DeltaCollisionTrials',x.ClosedCollisionTrials(b)-x.ClosedCollisionTrials(a), ...
            'DeltaNoObstacleBrakeTrials',x.NoObstacleBrakeTrials(b)-x.NoObstacleBrakeTrials(a));
        if isempty(rows), rows=r; else, rows(end+1)=r; end %#ok<AGROW>
    end
end
effects=struct2table(rows);
end
