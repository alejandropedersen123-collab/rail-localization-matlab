function write_report(R,out)
% Human-readable measurements, regenerated from the actual run.
fid=fopen(fullfile(out,'RESULTADOS.txt'),'w','n','UTF-8');
assert(fid~=-1,'Cannot write report'); closeFile=onCleanup(@() fclose(fid));
S=R.summary;
fprintf(fid,'RESULTADOS MEDIDOS — PROTOTIPO V2\n\n');
fprintf(fid,'MATLAB: %s\n',R.matlabVersion);
fprintf(fid,'%d escenarios; %d semillas por escenario; cuatro configuraciones.\n',numel(R.scenarios),R.runsPerScenario);
fprintf(fid,'%d combinaciones escenario/semilla; %d ensayos de arquitectura; %d simulaciones contando replay y lazo cerrado.\n\n', ...
    numel(R.scenarios)*R.runsPerScenario,height(R.trials),2*height(R.trials));
fprintf(fid,'SALTO GNSS DE -400 m: RMSE EN REPLAY\n');
x=S(S.ScenarioID==3,:);
for k=1:height(x), fprintf(fid,'%s: %.3f m\n',x.Architecture(k),x.OpenRMSE_m(k)); end
fprintf(fid,'Los controles también mejoran GPS sin añadir sensores; comparar ambos factores por separado.\n\n');
x=S(S.ScenarioID==11 & S.Architecture=="Fusion + controls",:);
fprintf(fid,'DERIVA COMPARTIDA\nFusión con controles: RMSE %.3f m; cobertura empírica de +/-3 sigma: %.2f%%.\n', ...
    x.OpenRMSE_m,100*x.Formal3SigmaCoverage);
fprintf(fid,'La incertidumbre formal subestima el error: añadir sensores no elimina fallos comunes.\n\n');
x=S(S.ScenarioID==13 & S.Architecture=="Fusion + controls",:);
fprintf(fid,'MAPA EQUIVOCADO PERO COHERENTE\nIdentidad incorrecta considerada conocida en %.2f%% de muestras.\n', ...
    100*x.WrongConfidentTrackFraction);
fprintf(fid,'El módulo lateral simplificado no resuelve este caso.\n\n');
fprintf(fid,'TRAYECTOS SIN OBSTÁCULO\n');
for id=[9 10 15 17]
    x=S(S.ScenarioID==id,:);
    fprintf(fid,'%s:\n',x.Scenario(1));
    for k=1:height(x)
        fprintf(fid,'  %s: %d avisos de peligro; %d ensayos con orden de freno, de %d.\n', ...
            x.Architecture(k),x.NoObstacleHazardAlarmTrials(k),x.NoObstacleBrakeTrials(k),x.Runs(k));
    end
end
fprintf(fid,'Los avisos diagnósticos se contabilizan aparte; en el modelo también activan freno.\n\n');
fprintf(fid,'FRENADO INSUFICIENTE: CRUCES GEOMÉTRICOS DEL OBSTÁCULO\n');
for id=[8 14]
    x=S(S.ScenarioID==id,:);
    for k=1:height(x)
        fprintf(fid,'%s / %s: %d de %d.\n',x.Scenario(k),x.Architecture(k),x.ClosedCollisionTrials(k),x.Runs(k));
    end
end
fprintf(fid,'En el caso de freno débil ni frenar desde el inicio basta bajo estos supuestos.\n\n');
fprintf(fid,'Ver checks.csv para pruebas de física, comparación y sustitución.\n');
fprintf(fid,'Los resultados son sintéticos: no representan LZB/ETCS, probabilidad de accidente, fiabilidad real ni ahorro demostrado.\n');
end
