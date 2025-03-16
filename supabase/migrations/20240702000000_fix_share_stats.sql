-- 修复get_share_stats函数中的列名歧义问题
CREATE OR REPLACE FUNCTION get_share_stats(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_clicks_count INTEGER;
  v_referrals_count INTEGER;
  v_referral_points BIGINT;
BEGIN
  -- 获取分享点击统计 - 明确指定表名前缀
  SELECT COUNT(sc.id) INTO v_clicks_count
  FROM share_clicks sc
  WHERE sc.sharer_id = get_share_stats.user_id;
  
  -- 获取成功推荐统计 - 明确指定表名前缀
  SELECT COUNT(r.id) INTO v_referrals_count
  FROM referrals r
  WHERE r.referrer_id = get_share_stats.user_id;
  
  -- 获取通过分享获得的积分 - 明确指定表名前缀
  SELECT COALESCE(SUM(pt.amount), 0) INTO v_referral_points
  FROM point_transactions pt
  WHERE pt.user_id = get_share_stats.user_id AND pt.type = 'referral';
  
  -- 返回统计结果
  RETURN jsonb_build_object(
    'totalClicks', v_clicks_count,
    'successfulReferrals', v_referrals_count,
    'pointsEarned', v_referral_points
  );
END;
$$ LANGUAGE plpgsql;