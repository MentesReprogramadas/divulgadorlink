"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ActionIcon } from "@/components/ui/action-icon";
import { Field, Input } from "@/components/ui/input";
import {
  WorkspaceActions,
  WorkspaceFilters,
} from "@/components/layout/workspace-controls";
import { RefreshButton } from "@/components/layout/workspace-actions";
import { OverlayDialog } from "@/components/ui/overlay-dialog";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { Skeleton } from "@/components/feedback/skeleton";
import {
  PermissionEditor,
  PermissionSummary,
  permissionProfile,
  type PermissionSection,
} from "./permission-editor";
import { selectWorkspace, type Grants } from "./workspace-access";
import { Tabs } from "@/components/ui/tabs";
import { TeamScreen } from "@/features/profile-team/team-screen";
import styles from "./workspace-team.module.css";
import { LiquidLens } from '@/components/ui/liquid-lens'
type Member = { id: string; name: string; version: number; grants: Grants };
type Team = {
  sections: PermissionSection[];
  members: Member[];
  invitations: Array<{ id: string; status: string; expiresAt: string }>;
};
async function request<T>(path: string, init?: RequestInit) {
  const response = await api<T & { message?: string }>("/v1/team" + path, init);
  if (response.status !== 200)
    throw new Error(response.body.message ?? "Não foi possível concluir.");
  return response.body;
}
export function WorkspaceTeamScreen({
  pendingOnly = false,
}: {
  pendingOnly?: boolean;
}) {
  const [team, setTeam] = useState<Team | null>(null),
    [spaces, setSpaces] = useState<Array<{ ownerId: string; name: string }>>(
      [],
    ),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [dialog, setDialog] = useState<{
      member: Member | null;
      grants: Grants;
    } | null>(null),
    [email, setEmail] = useState(""),
    [step, setStep] = useState(0),
    [link, setLink] = useState(""),
    [formError, setFormError] = useState(""),
    [revoking, setRevoking] = useState<Member | null>(null),
    [tab, setTab] = useState("team"),
    busy = useRef(false),
    trigger = useRef<HTMLElement | null>(null),
    key = useRef("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [next, shared] = await Promise.all([
        request<Team>(""),
        request<{ workspaces: typeof spaces }>("/workspaces"),
      ]);
      setTeam(next);
      setSpaces(shared.workspaces);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível carregar.",
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!pendingOnly) void load();
  }, [pendingOnly]);
  async function save() {
    if (busy.current || !dialog) return;
    busy.current = true;
    setPending(true);
    setFormError("");
    try {
      if (dialog.member) {
        await request("/members/" + dialog.member.id, {
          method: "PATCH",
          body: JSON.stringify({
            grants: dialog.grants,
            expectedVersion: dialog.member.version,
          }),
        });
        setDialog(null);
        setNotice("Permissões atualizadas.");
      } else {
        const result = await request<{ token: string | null }>("/invitations", {
          method: "POST",
          body: JSON.stringify({
            email,
            grants: dialog.grants,
            requestKey: key.current,
          }),
        });
        if (!result.token)
          throw new Error(
            "Convite já criado. Revogue e crie outro se perdeu o link.",
          );
        setLink(
          new URL(
            "/equipe/convite?scope=workspace&token=" + result.token,
            window.location.origin,
          ).href,
        );
      }
      await load();
    } catch (reason) {
      setFormError(
        reason instanceof Error ? reason.message : "Não foi possível salvar.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function revoke(id: string, version?: number) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      await request("/" + (version ? "members" : "invitations") + "/" + id, {
        method: "DELETE",
        ...(version
          ? { body: JSON.stringify({ expectedVersion: version }) }
          : {}),
      });
      setRevoking(null);
      setNotice("Acesso revogado.");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível revogar.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  const skeleton = pendingOnly || loading;
  return (
    <section
      className={styles.page}
      aria-label="Equipe da plataforma"
      aria-busy={skeleton || pending}
    >
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      <Tabs
        disabled={pendingOnly}
        value={tab}
        onChange={setTab}
        label="Visualizações da equipe"
        actions={tab==='team'?<WorkspaceActions>
                  <Button
                    disabled={skeleton || pending}
                    onClick={(event) => {
                      trigger.current = event.currentTarget;
                      key.current = crypto.randomUUID();
                      setEmail("");
                      setStep(0);
                      setLink("");
                      setFormError("");
                      setDialog({ member: null, grants: {} });
                    }}
                  >
                    <ActionIcon name="plus" />
                    Convidar colaborador
                  </Button>
                  <RefreshButton
                    disabled={skeleton || pending}
                    onClick={() => void load()}
                  />
                </WorkspaceActions>:undefined}
        items={[
          {
            id: "team",
            label: "Minha equipe",
            content: (
              <div className={styles.tabContent}>
                <header className={styles.teamHeader}>
                  <div className={styles.intro}>
                    <h2>Pessoas que colaboram com você</h2>
                    <p>Escolha quem pode acessar conteúdo, métricas, financeiro e outras áreas da conta.</p>
                  </div>

                </header>
                <WorkspaceFilters label="Filtrar colaboradores">
                  <Field label="Buscar pessoa">
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      disabled={pending || skeleton}
                    />
                  </Field>
                </WorkspaceFilters>
                <div className={styles.grid}>
                  {skeleton
                    ? [0, 1].map((id) => (
                        <div
                          key={id}
                          className={[styles.card, styles.pending].join(" ")}
                          aria-hidden
                        ><Skeleton width="55%" height={24} /><Skeleton width="80%" height={18} /><Skeleton width={112} height={44} /><LiquidLens radius={16} /></div>
                      ))
                    : team?.members
                        .filter((row) =>
                          row.name
                            .toLocaleLowerCase("pt-BR")
                            .includes(query.toLocaleLowerCase("pt-BR")),
                        )
                        .map((member) => (
                          <article className={styles.card} key={member.id}>
                            <h2>{member.name}</h2>
                            <span className={styles.badge}>
                              {permissionProfile(
                                team?.sections ?? [],
                                member.grants,
                              )}{" "}
                              ·{" "}
                              {
                                Object.values(member.grants).filter(
                                  (value) => value?.read,
                                ).length
                              }{" "}
                              seções liberadas
                            </span>
                            <div className={styles.quick}>
                              <Button
                                variant="secondary"
                                disabled={pending}
                                onClick={(event) => {
                                  trigger.current = event.currentTarget;
                                  setStep(1);
                                  setLink("");
                                  setFormError("");
                                  setDialog({
                                    member,
                                    grants: structuredClone(member.grants),
                                  });
                                }}
                              >
                                <ActionIcon name="settings" />
                                Permissões
                              </Button>
                              <Button
                                variant="danger"
                                disabled={pending}
                                onClick={(event) => {
                                  trigger.current = event.currentTarget;
                                  setRevoking(member);
                                }}
                              >
                                <ActionIcon name="disable" />
                                Revogar
                              </Button>
                            </div>
                          <LiquidLens radius={16} /></article>
                        ))}
                </div>
                {!skeleton && !error && team && !team.members.length ? (
                  <EmptyState>
                    Convide pessoas e escolha o que cada uma pode acessar.
                  </EmptyState>
                ) : null}
                {team?.invitations.some((row) => row.status === "PENDING") ? (
                  <section
                    className={styles.card}
                    aria-label="Convites para equipe"
                  >
                    <h2>Convites para equipe</h2>
                    {team.invitations
                      .filter((row) => row.status === "PENDING")
                      .map((row) => (
                        <div key={row.id} className={styles.steps}>
                          <span>
                            Expira em{" "}
                            {new Date(row.expiresAt).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                          <Button
                            variant="danger"
                            disabled={pending}
                            onClick={() => void revoke(row.id)}
                          >
                            <ActionIcon name="disable" />
                            Revogar convite
                          </Button>
                        </div>
                      ))}
                  <LiquidLens radius={16} /></section>
                ) : null}
              </div>
            ),
          },
          {
            id: "shared",
            label: "Compartilhados comigo",
            content: (
              <div className={styles.tabContent}>
                <div className={styles.intro}>
                  <h2>Acessos que você recebeu</h2>
                  <p>Abra uma conta que outra pessoa compartilhou com você.</p>
                </div>
                {spaces.length ? (
                  <section
                    className={styles.grid}
                    aria-label="Espaços compartilhados comigo"
                  >
                    {spaces.map((space) => (
                      <article className={styles.card} key={space.ownerId}>
                        <h2>{space.name}</h2>
                        <Button
                          onClick={() =>
                            void selectWorkspace(space.ownerId).catch(
                              (reason) => setError(reason.message),
                            )
                          }
                        >
                          <ActionIcon name="teamAccess" />
                          Abrir espaço compartilhado
                        </Button>
                      <LiquidLens radius={16} /></article>
                    ))}
                  </section>
                ) : null}
                {!skeleton && !error && team && !spaces.length ? (
                  <EmptyState>
                    Nenhuma conta compartilhada com você no momento.
                  </EmptyState>
                ) : null}
              </div>
            ),
          },
          {
            id: "pages",
            label: "Acessos por página",
            content: (
              <div className={styles.tabContent}>
                <TeamScreen />
              </div>
            ),
          },
        ]}
      />
      <OverlayDialog
        open={!!dialog}
        title={
          dialog?.member
            ? "Permissões de " + dialog.member.name
            : "Convidar para minha equipe"
        }
        returnFocusTo={trigger.current}
        closeDisabled={pending}
        onClose={() => {
          if (!pending) setDialog(null);
        }}
        size={step > 0 ? "wide" : "default"}
      >
        {dialog ? (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              if (step < 2) {
                setStep(step + 1);
                requestAnimationFrame(() =>
                  document.getElementById("team-step-title")?.focus(),
                );
              } else void save();
            }}
          >
            {!link ? (
              <>
                <ol className={styles.progress} aria-label="Etapas do convite">
                  {["Pessoa", "Acesso", "Revisão"].map((label, index) => (
                    <li
                      key={label}
                      aria-current={step === index ? "step" : undefined}
                      data-done={step > index}
                    >
                      <span>{index + 1}</span>
                      {label}
                    </li>
                  ))}
                </ol>
                <h3
                  id="team-step-title"
                  tabIndex={-1}
                  className={styles.stepTitle}
                >
                  {step === 0
                    ? "Quem vai colaborar?"
                    : step === 1
                      ? "Defina o acesso"
                      : "Confira antes de confirmar"}
                </h3>
              </>
            ) : null}
            {link ? (
              <>
                <p>Envie este convite à pessoa. Válido por 7 dias.</p>
                <Field label="Link do convite">
                  <Input readOnly value={link} />
                </Field>
                <Button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(link)
                      .then(() => setFormError("Convite copiado."))
                      .catch(() => setFormError("Selecione e copie o link."))
                  }
                >
                  <ActionIcon name="copy" />
                  Copiar convite
                </Button>
              </>
            ) : step === 0 ? (
              <Field
                label="E-mail da pessoa"
                hint="Ela precisa aceitar com este e-mail confirmado."
              >
                <Input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  disabled={pending}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    key.current = crypto.randomUUID();
                  }}
                />
              </Field>
            ) : step === 2 ? (
              <>
                <p>
                  {dialog.member ? dialog.member.name : email} terá os acessos
                  abaixo.
                </p>
                <PermissionSummary
                  sections={team?.sections ?? []}
                  grants={dialog.grants}
                />
              </>
            ) : (
              <PermissionEditor
                sections={team?.sections ?? []}
                grants={dialog.grants}
                disabled={pending}
                onChange={(grants) => {
                  setDialog({ ...dialog, grants });
                  key.current = crypto.randomUUID();
                }}
              />
            )}
            {formError ? <p role="alert">{formError}</p> : null}
            <div className={styles.quick}>
              {step > 0 && !(dialog.member && step === 1) && !link ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setStep(step - 1);
                    requestAnimationFrame(() =>
                      document.getElementById("team-step-title")?.focus(),
                    );
                  }}
                  disabled={pending || (!!dialog.member && step === 1)}
                >
                  <ActionIcon name="back" />
                  Voltar
                </Button>
              ) : null}
              {!link ? (
                <Button
                  type="submit"
                  disabled={
                    pending ||
                    (step === 1 &&
                      !dialog.member &&
                      !Object.values(dialog.grants).some((row) => row?.read))
                  }
                  loading={pending}
                >
                  <ActionIcon name={step < 2 ? "next" : "save"} />
                  {step === 0
                    ? "Escolher permissões"
                    : step === 1
                      ? "Revisar acesso"
                      : dialog.member
                        ? "Salvar permissões"
                        : "Criar convite"}
                </Button>
              ) : (
                <Button type="button" onClick={() => setDialog(null)}>
                  <ActionIcon name="check" />
                  Concluir
                </Button>
              )}
            </div>
          </form>
        ) : null}
      </OverlayDialog>
      <OverlayDialog
        open={!!revoking}
        title="Revogar acesso"
        returnFocusTo={trigger.current}
        closeDisabled={pending}
        onClose={() => {
          if (!pending) setRevoking(null);
        }}
      >
        <p>
          O acesso de {revoking?.name} será removido de todas as seções
          compartilhadas.
        </p>
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (revoking) void revoke(revoking.id, revoking.version);
          }}
        >
          <ActionIcon name="disable" />
          Confirmar revogação
        </Button>
      </OverlayDialog>
    </section>
  );
}
