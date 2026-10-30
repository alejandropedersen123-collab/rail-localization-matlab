function plot_results(R,out)
S=R.summary; E=R.examples; labels=string({R.architectures.name});
colors=[.15 .35 .65;.85 .35 .1;.2 .6 .4;.55 .25 .65];
f=newFigure(); tl=tiledlayout(2,2,'Padding','compact','TileSpacing','compact');
title(tl,'Paired synthetic experiments | prototype, not a railway safety system');
ids=[1 2 3 4 11 16];
nexttile; bar(values(S,ids,'OpenRMSE_m')); grid on;
setLabels(R,ids); ylabel('Replay position RMSE (m)'); title('Sensor set and controls are separate factors');
legend(labels,'Location','northwest');
nexttile; ids=[1 3 5 8 11 14]; bar(values(S,ids,'ClosedCollisionTrials')); grid on;
setLabels(R,ids); ylabel(sprintf('Obstacle crossings / %d seeds',R.runsPerScenario));
title('Closed-loop model: insufficient braking can still fail');
nexttile; ids=[9 10 15 17]; bar(values(S,ids,'NoObstacleBrakeTrials')); grid on;
setLabels(R,ids); ylabel('Brake commands with no obstacle');
title('Cost of conservative responses on a clear track');
nexttile; ids=[1 3 11]; bar(100*values(S,ids,'Formal3SigmaCoverage')); grid on;
setLabels(R,ids); ylim([0 105]); ylabel('Samples within formal 3 sigma (%)');
title('Check uncertainty against truth, including shared drift');
finish(f,out,'overview.png');

f=newFigure(); tl=tiledlayout(2,2,'Padding','compact','TileSpacing','compact');
title(tl,'Closed-loop examples | seed 1001 | reaction, brake build-up, slope and adhesion');
nexttile; draw(E,1,'speed',colors,2); ylabel('Speed (m/s)'); title('Nominal approach: feedback changes the trajectory');
legend(labels,'Location','northeast');
nexttile; draw(E,1,'truth',colors,2); yline(R.config.leaderRear,'k--','Obstacle');
ylim([0 1.1*R.config.leaderRear]);
ylabel('Front position (m)'); title('Nominal stopping trajectories');
nexttile; draw(E,8,'truth',colors,2); yline(R.config.leaderRear,'k--','Obstacle');
ylabel('Front position (m)'); title('Weak brakes: warning alone is insufficient');
nexttile; draw(E,14,'speed',colors,2); ylabel('Speed (m/s)');
title('Downhill and low adhesion: slower braking');
finish(f,out,'braking.png');

f=newFigure(); tl=tiledlayout(2,2,'Padding','compact','TileSpacing','compact');
title(tl,'Failure diagnostics | traces: seed 1001; bar chart: all seeds');
nexttile;
for a=1:4
    z=E{3,a,1}; plot(z.t,z.estimate-z.truth,'Color',colors(a,:),'LineWidth',1.4); hold on;
end
grid on; xlabel('Time (s)'); ylabel('Position error (m)'); title('GNSS jump: paired replay'); legend(labels,'Location','southeast');
nexttile; z=E{11,4,1}; plot(z.t,z.estimate-z.truth,'Color',colors(4,:),'LineWidth',1.5); hold on;
plot(z.t,3*z.sigma,'k--'); plot(z.t,-3*z.sigma,'k--'); grid on;
xlabel('Time (s)'); ylabel('Error / formal interval (m)'); title('Shared drift can defeat formal uncertainty');
legend('Fusion + controls error','+3 sigma','-3 sigma','Location','southwest');
nexttile;
for id=[7 12 13]
    z=E{id,4,1}; plot(z.t,z.trackP1,'LineWidth',1.3); hold on;
end
grid on; xlabel('Time (s)'); ylabel('Relative likelihood of track 1'); ylim([-.05 1.05]);
title('Two straight-track hypotheses; no turnout solution');
legend('Parallel tracks','Displaced map','Aliased map','Location','best');
nexttile; ids=[7 12 13]; unknown=values(S,ids,'UnknownTrackFraction'); wrong=values(S,ids,'WrongConfidentTrackFraction');
bar([unknown(:,4),wrong(:,4)]);
setLabels(R,ids); ylim([0 1.05]); grid on; ylabel('Fraction of replay samples');
title('A wrong map can look consistent'); legend('Unknown','Confident but wrong','Location','best');
finish(f,out,'degradation.png');
end

function v=values(S,ids,field)
v=zeros(numel(ids),4);
for k=1:numel(ids), x=S(S.ScenarioID==ids(k),:); v(k,:)=x.(field)'; end
end
function setLabels(R,ids)
xticks(1:numel(ids)); xticklabels(string({R.scenarios(ids).name})); xtickangle(20);
end
function draw(E,id,field,colors,mode)
for a=1:4
    z=E{id,a,mode}; plot(z.t,z.(field),'Color',colors(a,:),'LineWidth',1.4); hold on;
end
grid on; xlabel('Time (s)');
end
function f=newFigure()
f=figure('Visible','off','Color','w','Position',[20 20 1450 900]);
end
function finish(f,out,name)
ax=findall(f,'Type','axes');
for k=1:numel(ax)
    set(ax(k),'Color','w','XColor',[.12 .16 .2],'YColor',[.12 .16 .2], ...
        'GridColor',[.55 .6 .65],'GridAlpha',.25,'FontSize',10,'ColorOrder', ...
        [.15 .35 .65;.85 .35 .1;.2 .6 .4;.55 .25 .65]);
end
tx=findall(f,'Type','text'); set(tx,'Color',[.10 .14 .18]);
layouts=findall(f,'Type','tiledlayout');
for k=1:numel(layouts), layouts(k).Title.Color=[.10 .14 .18]; end
lg=findall(f,'Type','legend');
for k=1:numel(lg), set(lg(k),'Color','w','TextColor',[.1 .14 .18]); end
exportgraphics(f,fullfile(out,name),'Resolution',150); close(f);
end
