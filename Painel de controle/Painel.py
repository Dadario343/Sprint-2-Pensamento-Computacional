#!/usr/bin/env python3
# ============================================================
#   ChargeGrid Intelligence — Sistema de Cobrança
#   FIAP · GoodWe Challenge · Sprint 2
#   Planos: Pré-pago e Pós-pago
# ============================================================

import time
import random

# ── Constantes ───────────────────────────────────────────
TENSAO      = 230       # Volts
TARIFA      = 0.85      # R$/kWh
LIMITE_KW   = 30.0      # Demanda máxima contratada

# ── Utilitários ──────────────────────────────────────────
def linha(char="─", n=52):
    print(char * n)

def cabecalho():
    print()
    linha("═")
    print("  ⚡  ChargeGrid Intelligence — Sistema de Cobrança")
    print("       FIAP · GoodWe Challenge · Sprint 2")
    linha("═")

def fmt_brl(valor):
    return f"R$ {valor:.2f}".replace(".", ",")

def fmt_kwh(valor):
    return f"{valor:.3f} kWh".replace(".", ",")

def barra_progresso(pct, largura=30):
    preenchido = int(largura * pct / 100)
    barra = "█" * preenchido + "░" * (largura - preenchido)
    return f"[{barra}] {pct:.0f}%"

# ── Simulação de carregamento ─────────────────────────────
def simular_carregamento(corrente_inicial, duracao_s, plano, credito_kwh=None):
    """
    Simula segundo a segundo o carregamento de um VE.
    Retorna o total de energia consumida e custo final.
    """
    wh_total   = 0.0
    corrente   = corrente_inicial
    encerrado  = False

    print()
    print("  Simulando carregamento em tempo real...")
    print("  (intervalo comprimido: 1 tick = ~10 min reais)")
    linha()

    for tick in range(duracao_s):
        # Variação de corrente (ruído realista)
        corrente += random.uniform(-0.3, 0.3)
        corrente  = max(2.0, min(13.0, corrente))

        potencia_kw = (TENSAO * corrente) / 1000
        wh_tick     = (TENSAO * corrente) / 3600          # Wh por segundo de simulação
        wh_total   += wh_tick
        kwh_total   = wh_total / 1000
        custo_atual = kwh_total * TARIFA
        demanda_pct = (potencia_kw / LIMITE_KW) * 100

        # Status de demanda
        if demanda_pct > 85:
            status_demanda = "⚠  ALTA"
        elif demanda_pct > 60:
            status_demanda = "~  MÉDIA"
        else:
            status_demanda = "✓  NORMAL"

        # Exibe linha de status
        print(
            f"\r  {tick+1:>3}s | "
            f"{potencia_kw:.2f} kW | "
            f"{fmt_kwh(kwh_total)} | "
            f"{fmt_brl(custo_atual)} | "
            f"Demanda {status_demanda:<14}",
            end="", flush=True
        )

        # Lógica pré-pago: encerra ao atingir o crédito
        if plano == "pre" and credito_kwh is not None:
            if kwh_total >= credito_kwh:
                print()
                print()
                print("  💳  Crédito esgotado — carregamento encerrado automaticamente.")
                encerrado = True
                break

        time.sleep(0.18)   # comprime o tempo para a demo

    if not encerrado:
        print()

    return kwh_total, kwh_total * TARIFA

# ── Fluxo Pré-pago ────────────────────────────────────────
def fluxo_prepago():
    print()
    linha()
    print("  MODO PRÉ-PAGO")
    print("  O usuário define quanto quer gastar antes de carregar.")
    print("  O carregador para automaticamente ao atingir o limite.")
    linha()

    while True:
        try:
            valor_str = input("\n  Informe o valor a creditar (R$): R$ ").replace(",", ".")
            valor     = float(valor_str)
            if valor <= 0:
                raise ValueError
            break
        except ValueError:
            print("  ❌  Valor inválido. Tente novamente.")

    credito_kwh = valor / TARIFA
    print()
    print(f"  Crédito carregado : {fmt_brl(valor)}")
    print(f"  Energia disponível: {fmt_kwh(credito_kwh)}")
    print(f"  Tarifa aplicada   : R$ {TARIFA:.2f}/kWh")

    input("\n  Pressione ENTER para iniciar o carregamento...")

    kwh, custo = simular_carregamento(
        corrente_inicial=7.5,
        duracao_s=40,
        plano="pre",
        credito_kwh=credito_kwh
    )

    print()
    linha()
    print("  📄  RECIBO — PRÉ-PAGO")
    linha()
    print(f"  Energia consumida : {fmt_kwh(kwh)}")
    print(f"  Valor cobrado     : {fmt_brl(custo)}")
    print(f"  Crédito restante  : {fmt_brl(max(0, valor - custo))}")
    linha()

# ── Fluxo Pós-pago ────────────────────────────────────────
def fluxo_pospago():
    print()
    linha()
    print("  MODO PÓS-PAGO")
    print("  O carregamento ocorre livremente.")
    print("  O valor é cobrado ao final da sessão.")
    linha()

    veiculo = input("\n  ID do veículo (ex: VE-2841): ").strip() or "VE-0000"

    input("\n  Pressione ENTER para iniciar o carregamento...")

    kwh, custo = simular_carregamento(
        corrente_inicial=9.0,
        duracao_s=40,
        plano="pos"
    )

    print()
    linha()
    print("  📄  RECIBO — PÓS-PAGO")
    linha()
    print(f"  Veículo           : #{veiculo}")
    print(f"  Energia consumida : {fmt_kwh(kwh)}")
    print(f"  Tarifa aplicada   : R$ {TARIFA:.2f}/kWh")
    print(f"  Total a pagar     : {fmt_brl(custo)}")
    linha()
    print()
    print("  Formas de pagamento disponíveis:")
    print("    [1] PIX")
    print("    [2] Cartão de crédito")
    print("    [3] App ChargeGrid")
    print()

    while True:
        op = input("  Escolha: ").strip()
        if op in ("1", "2", "3"):
            break
        print("  ❌  Opção inválida.")

    metodos = {"1": "PIX", "2": "Cartão de crédito", "3": "App ChargeGrid"}
    print()
    print(f"  ✅  Pagamento via {metodos[op]} confirmado — {fmt_brl(custo)}")
    linha()

# ── Menu principal ────────────────────────────────────────
def menu():
    cabecalho()
    print()
    print("  Selecione o plano de cobrança:")
    print()
    print("    [1]  💳  Pré-pago  — credite antes de carregar")
    print("    [2]  🚗  Pós-pago  — pague ao finalizar")
    print("    [0]  Sair")
    print()
    linha()

    while True:
        op = input("  Opção: ").strip()
        if op == "1":
            fluxo_prepago()
        elif op == "2":
            fluxo_pospago()
        elif op == "0":
            print()
            print("  Até logo! ⚡")
            print()
            break
        else:
            print("  ❌  Opção inválida.")
            continue

        print()
        continuar = input("  Iniciar nova sessão? (s/n): ").strip().lower()
        if continuar != "s":
            print()
            print("  Até logo! ⚡")
            print()
            break
        cabecalho()
        print()
        print("    [1]  💳  Pré-pago")
        print("    [2]  🚗  Pós-pago")
        print("    [0]  Sair")
        print()
        linha()

# ── Entry point ───────────────────────────────────────────
if __name__ == "__main__":
    menu()