#!/bin/bash
set -a
source /home/as/Desktop/Antigravity/AutoColdEmail/.env 2>/dev/null || true
set +a
export N8N_BLOCK_ENV_ACCESS_IN_NODE="false"

# Wait for n8n Task Broker port (5679) to be free
wait_port_free() {
  for i in $(seq 1 30); do
    if ! ss -tlnp 2>/dev/null | grep -q 5679 && ! pgrep -f "n8n.*execute\|n8n.*start" > /dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "[$(date)] WARNING: Port 5679 may still be in use"
}

TOTAL=13
SENT=0
FAILED=0

echo "[$(date)] Starting send sequence: $TOTAL emails with 90s cooldown"
echo ""

echo "[$(date)] Sending 1/13: Lead 5: RemLAT, jumta remonts → remlat@inbox.lv"
wait_port_free
if npx n8n execute --id=eNBQwcURUPyM5brj > /tmp/n8n_exec_0.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 5: RemLAT, jumta remonts → remlat@inbox.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 5: RemLAT, jumta remonts → remlat@inbox.lv"
  cat /tmp/n8n_exec_0.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 2/13: Lead 6: Salons Necesse → studija@necesse.lv"
wait_port_free
if npx n8n execute --id=PfzKTjaxUgoagOM2 > /tmp/n8n_exec_1.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 6: Salons Necesse → studija@necesse.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 6: Salons Necesse → studija@necesse.lv"
  cat /tmp/n8n_exec_1.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 3/13: Lead 7: GRIEZE → grieze@grieze.lv"
wait_port_free
if npx n8n execute --id=T0HtzZZuClLK0x15 > /tmp/n8n_exec_2.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 7: GRIEZE → grieze@grieze.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 7: GRIEZE → grieze@grieze.lv"
  cat /tmp/n8n_exec_2.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 4/13: Lead 8: Catrin' beauty studio → info@catrinsalons.lv"
wait_port_free
if npx n8n execute --id=GeE3GP5fKNMPXL34 > /tmp/n8n_exec_3.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 8: Catrin' beauty studio → info@catrinsalons.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 8: Catrin' beauty studio → info@catrinsalons.lv"
  cat /tmp/n8n_exec_3.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 5/13: Lead 9: Beauty salon Skaistuma Industrija S9 → info@s9.lv"
wait_port_free
if npx n8n execute --id=s4EHiV8E9pQ1uSlm > /tmp/n8n_exec_4.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 9: Beauty salon Skaistuma Industrija S9 → info@s9.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 9: Beauty salon Skaistuma Industrija S9 → info@s9.lv"
  cat /tmp/n8n_exec_4.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 6/13: Lead 10: Skaistumkopšanas salons BBbinnija → bbbinnija@bbbinnija.lv"
wait_port_free
if npx n8n execute --id=wEzL4NDdOz7BWvRo > /tmp/n8n_exec_5.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 10: Skaistumkopšanas salons BBbinnija → bbbinnija@bbbinnija.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 10: Skaistumkopšanas salons BBbinnija → bbbinnija@bbbinnija.lv"
  cat /tmp/n8n_exec_5.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 7/13: Lead 11: SIBI beauty salon → sibisalon@inbox.lv"
wait_port_free
if npx n8n execute --id=78LMcg9kBYV6NYqp > /tmp/n8n_exec_6.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 11: SIBI beauty salon → sibisalon@inbox.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 11: SIBI beauty salon → sibisalon@inbox.lv"
  cat /tmp/n8n_exec_6.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 8/13: Lead 12: Gloria → info@gloria-salons.lv"
wait_port_free
if npx n8n execute --id=sCLaOA2kJoEgLPp3 > /tmp/n8n_exec_7.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 12: Gloria → info@gloria-salons.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 12: Gloria → info@gloria-salons.lv"
  cat /tmp/n8n_exec_7.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 9/13: Lead 13: VLUX → info@violetalux.lv"
wait_port_free
if npx n8n execute --id=S7PP0uSQCRRFtnMA > /tmp/n8n_exec_8.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 13: VLUX → info@violetalux.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 13: VLUX → info@violetalux.lv"
  cat /tmp/n8n_exec_8.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 10/13: Lead 14: Skaistuma agentura frizētava → info@skaistumaagentura.lv"
wait_port_free
if npx n8n execute --id=190yMzSOoPepVxHz > /tmp/n8n_exec_9.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 14: Skaistuma agentura frizētava → info@skaistumaagentura.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 14: Skaistuma agentura frizētava → info@skaistumaagentura.lv"
  cat /tmp/n8n_exec_9.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 11/13: Lead 15: Skaistuma Studija Miledia → info@salonsmiledia.lv"
wait_port_free
if npx n8n execute --id=3L8WB4ixPsOD0bkz > /tmp/n8n_exec_10.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 15: Skaistuma Studija Miledia → info@salonsmiledia.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 15: Skaistuma Studija Miledia → info@salonsmiledia.lv"
  cat /tmp/n8n_exec_10.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 12/13: Lead 16: MY NAILS Manikirs Riga → info@mynails.lv"
wait_port_free
if npx n8n execute --id=aBDXAjEnfFAhxQyF > /tmp/n8n_exec_11.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 16: MY NAILS Manikirs Riga → info@mynails.lv"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 16: MY NAILS Manikirs Riga → info@mynails.lv"
  cat /tmp/n8n_exec_11.log | tail -5
fi
echo "[$(date)] Waiting 90s before next email..."
sleep 90

echo "[$(date)] Sending 13/13: Lead 17: Nails and Pearls Manikira studija → nailspearls777@gmail.com"
wait_port_free
if npx n8n execute --id=ZL1sX5ZawadpjFyW > /tmp/n8n_exec_12.log 2>&1; then
  SENT=$((SENT+1))
  echo "[$(date)] SUCCESS: Lead 17: Nails and Pearls Manikira studija → nailspearls777@gmail.com"
else
  FAILED=$((FAILED+1))
  echo "[$(date)] FAILED: Lead 17: Nails and Pearls Manikira studija → nailspearls777@gmail.com"
  cat /tmp/n8n_exec_12.log | tail -5
fi

echo ""
echo "[$(date)] Done. Sent: $SENT / 13, Failed: $FAILED"
echo "[$(date)] Sending completion SMS via Twilio to +37127307068..."
npx n8n execute --id=2yT0AoxafC4v8bJd >> /tmp/n8n_twilio.log 2>&1
if [ $? -eq 0 ]; then
  echo "[$(date)] SMS sent successfully!"
else
  echo "[$(date)] SMS failed. Error output:"
  tail -5 /tmp/n8n_twilio.log
  echo "[$(date)] NOTE: Check your Twilio 'from' phone number in n8n credentials (workflow ID: 2yT0AoxafC4v8bJd)"
fi
